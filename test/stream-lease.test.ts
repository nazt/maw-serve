import { expect, test } from "bun:test";

import {
  GLOBAL_STREAM_CAP,
  PREVIEW_STREAM_RESERVE,
  StreamLeaseAllocator,
  TRANSIENT_STREAM_RESERVE,
  WORKING_STREAM_BUDGET,
} from "../web/src/board/streamLease";

test("stream lane budgets add up to the hard global cap", () => {
  expect(
    WORKING_STREAM_BUDGET + PREVIEW_STREAM_RESERVE + TRANSIENT_STREAM_RESERVE,
  ).toBe(GLOBAL_STREAM_CAP);
});

test("working leases degrade to poll and LRU-promote without exceeding 20 streams", () => {
  let now = 0;
  const allocator = new StreamLeaseAllocator(() => ++now);
  const leases = Array.from({ length: WORKING_STREAM_BUDGET + 2 }, (_, index) => (
    allocator.requestLease(`pane:${index}`, { priority: 50 })
  ));

  expect(allocator.snapshot().streaming).toBe(WORKING_STREAM_BUDGET);
  expect(allocator.snapshot().polling).toBe(2);
  expect(leases[0].mode).toBe("poll");
  expect(leases.at(-1)?.mode).toBe("stream");

  leases[0].touch();
  expect(leases[0].mode).toBe("stream");
  expect(leases[1].mode).toBe("poll");
});

test("off-screen leases surrender slots, return through LRU, and release idempotently", () => {
  let now = 0;
  const allocator = new StreamLeaseAllocator(() => ++now);
  const leases = Array.from({ length: WORKING_STREAM_BUDGET + 1 }, (_, index) => (
    allocator.requestLease(`pane:${index}`, { priority: 50 })
  ));
  const newest = leases.at(-1)!;
  const displaced = leases[0];

  expect(newest.mode).toBe("stream");
  expect(displaced.mode).toBe("poll");
  newest.setVisible(false);
  expect(newest.mode).toBe("poll");
  expect(displaced.mode).toBe("stream");
  newest.setVisible(true);
  expect(newest.mode).toBe("stream");

  newest.release();
  newest.release();
  expect(newest.released).toBe(true);
  expect(allocator.snapshot().total).toBe(WORKING_STREAM_BUDGET);
  expect(allocator.snapshot().streaming).toBe(WORKING_STREAM_BUDGET);
});

test("priority wins before recency and reserve lanes stay isolated", () => {
  const allocator = new StreamLeaseAllocator();
  const low = Array.from({ length: WORKING_STREAM_BUDGET }, (_, index) => (
    allocator.requestLease(`low:${index}`, { priority: 10 })
  ));
  const high = allocator.requestLease("high", { priority: 90 });
  const previews = Array.from({ length: PREVIEW_STREAM_RESERVE + 1 }, (_, index) => (
    allocator.requestLease(`preview:${index}`, { priority: 50, lane: "preview" })
  ));
  const transients = Array.from({ length: TRANSIENT_STREAM_RESERVE + 1 }, (_, index) => (
    allocator.requestLease(`transient:${index}`, { priority: 50, lane: "transient" })
  ));

  expect(high.mode).toBe("stream");
  expect(low.filter((lease) => lease.mode === "poll")).toHaveLength(1);
  expect(previews.filter((lease) => lease.mode === "stream")).toHaveLength(2);
  expect(transients.filter((lease) => lease.mode === "stream")).toHaveLength(2);
  expect(allocator.snapshot().streaming).toBe(GLOBAL_STREAM_CAP);
});

test("duplicate targets are ref-counted diagnostically without hiding connections", () => {
  const allocator = new StreamLeaseAllocator();
  const first = allocator.requestLease("session:pane", { priority: 50 });
  const second = allocator.requestLease("session:pane", { priority: 50 });

  expect(allocator.snapshot().targetRefs["session:pane"]).toBe(2);
  expect(allocator.snapshot().streaming).toBe(2);
  first.release();
  expect(allocator.snapshot().targetRefs["session:pane"]).toBe(1);
  second.release();
  expect(allocator.snapshot().targetRefs["session:pane"]).toBeUndefined();
});

