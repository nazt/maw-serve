export type StreamLeaseMode = "stream" | "poll";
export type StreamLeaseLane = "working" | "preview" | "transient";

export const GLOBAL_STREAM_CAP = 24;
export const WORKING_STREAM_BUDGET = 20;
export const PREVIEW_STREAM_RESERVE = 2;
export const TRANSIENT_STREAM_RESERVE = 2;

export const STREAM_PRIORITY = {
  background: 10,
  normal: 50,
  active: 70,
  focused: 90,
} as const;

const LANE_CAPACITY: Record<StreamLeaseLane, number> = {
  working: WORKING_STREAM_BUDGET,
  preview: PREVIEW_STREAM_RESERVE,
  transient: TRANSIENT_STREAM_RESERVE,
};

export interface StreamLeaseOptions {
  priority: number;
  lane?: StreamLeaseLane;
  visible?: boolean;
}

export interface StreamLease {
  readonly targetKey: string;
  readonly mode: StreamLeaseMode;
  readonly released: boolean;
  release(): void;
  setVisible(visible: boolean): void;
  touch(): void;
  subscribe(listener: (mode: StreamLeaseMode) => void): () => void;
}

export interface StreamLeaseSnapshot {
  total: number;
  streaming: number;
  polling: number;
  byLane: Record<StreamLeaseLane, { total: number; streaming: number }>;
  targetRefs: Record<string, number>;
}

interface LeaseRecord {
  id: number;
  targetKey: string;
  lane: StreamLeaseLane;
  priority: number;
  visible: boolean;
  lastUsed: number;
  mode: StreamLeaseMode;
  released: boolean;
  listeners: Set<(mode: StreamLeaseMode) => void>;
}

function finitePriority(value: number): number {
  return Number.isFinite(value) ? value : STREAM_PRIORITY.normal;
}

/**
 * Allocates transport permission, not terminal content. Every mounted terminal
 * owns one lease so the count matches the number of EventSources it can open.
 * `targetRefs` still tracks duplicate pane consumers for diagnostics and later
 * transport multiplexing without under-counting today's connections.
 */
export class StreamLeaseAllocator {
  private readonly leases = new Map<number, LeaseRecord>();
  private sequence = 0;

  constructor(private readonly now: () => number = Date.now) {}

  requestLease(targetKey: string, options: StreamLeaseOptions): StreamLease {
    const key = targetKey.trim();
    if (!key) throw new TypeError("Stream leases require a target key");

    const record: LeaseRecord = {
      id: ++this.sequence,
      targetKey: key,
      lane: options.lane ?? "working",
      priority: finitePriority(options.priority),
      visible: options.visible ?? true,
      lastUsed: this.now(),
      mode: "poll",
      released: false,
      listeners: new Set(),
    };
    this.leases.set(record.id, record);
    this.rebalance();

    const allocator = this;
    return {
      get targetKey() {
        return record.targetKey;
      },
      get mode() {
        return record.mode;
      },
      get released() {
        return record.released;
      },
      release() {
        if (record.released) return;
        record.released = true;
        record.listeners.clear();
        allocator.leases.delete(record.id);
        allocator.rebalance();
      },
      setVisible(visible: boolean) {
        if (record.released || record.visible === visible) return;
        record.visible = visible;
        if (visible) record.lastUsed = allocator.now();
        allocator.rebalance();
      },
      touch() {
        if (record.released) return;
        record.lastUsed = allocator.now();
        allocator.rebalance();
      },
      subscribe(listener: (mode: StreamLeaseMode) => void) {
        if (record.released) return () => {};
        record.listeners.add(listener);
        return () => record.listeners.delete(listener);
      },
    };
  }

  available(lane: StreamLeaseLane = "working"): number {
    const streaming = [...this.leases.values()].filter((lease) => (
      !lease.released && lease.lane === lane && lease.mode === "stream"
    )).length;
    return Math.max(0, LANE_CAPACITY[lane] - streaming);
  }

  snapshot(): StreamLeaseSnapshot {
    const byLane: StreamLeaseSnapshot["byLane"] = {
      working: { total: 0, streaming: 0 },
      preview: { total: 0, streaming: 0 },
      transient: { total: 0, streaming: 0 },
    };
    const targetRefs: Record<string, number> = {};
    let streaming = 0;

    for (const lease of this.leases.values()) {
      if (lease.released) continue;
      byLane[lease.lane].total += 1;
      targetRefs[lease.targetKey] = (targetRefs[lease.targetKey] ?? 0) + 1;
      if (lease.mode === "stream") {
        streaming += 1;
        byLane[lease.lane].streaming += 1;
      }
    }

    const total = Object.values(byLane).reduce((sum, lane) => sum + lane.total, 0);
    return {
      total,
      streaming,
      polling: total - streaming,
      byLane,
      targetRefs,
    };
  }

  private rebalance(): void {
    for (const lane of Object.keys(LANE_CAPACITY) as StreamLeaseLane[]) {
      const candidates = [...this.leases.values()]
        .filter((lease) => !lease.released && lease.lane === lane && lease.visible)
        .sort((left, right) => (
          right.priority - left.priority ||
          right.lastUsed - left.lastUsed ||
          right.id - left.id
        ));
      const streaming = new Set(
        candidates.slice(0, LANE_CAPACITY[lane]).map((lease) => lease.id),
      );

      for (const lease of this.leases.values()) {
        if (lease.released || lease.lane !== lane) continue;
        const nextMode: StreamLeaseMode = streaming.has(lease.id) ? "stream" : "poll";
        if (lease.mode === nextMode) continue;
        lease.mode = nextMode;
        for (const listener of lease.listeners) listener(nextMode);
      }
    }
  }
}

export const streamLeaseAllocator = new StreamLeaseAllocator();

export function requestLease(
  targetKey: string,
  options: StreamLeaseOptions,
): StreamLease {
  return streamLeaseAllocator.requestLease(targetKey, options);
}

export function streamLeaseSnapshot(): StreamLeaseSnapshot {
  return streamLeaseAllocator.snapshot();
}

