import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { activeHost, activePeopleHost } from "../clients/api";
import StatusBar from "../fleet/StatusBar";
import { useTheme } from "../useTheme";
import {
  exchangePeopleBootstrap,
  loadPeopleSnapshot,
  loadPersonContext,
  peopleHostConfigured,
  pollPeopleUnlock,
  requestPeopleUnlock,
  revokePeopleAccess,
  type PeopleReadSnapshot,
} from "./client";
import type {
  PeopleAccessGrant,
  PeopleContact,
  PeoplePersonContext,
  PeoplePersonConversation,
} from "./types";
import "./people.css";

export interface PeoplePageProps {
  bootstrapCode: string | null;
}

type PeopleViewMode = "people" | "rooms";
type PeopleWindowDays = 30 | 60 | 90;
type UnlockPhase = "locked" | "unlocking" | "granted" | "error";

interface UnlockState {
  phase: UnlockPhase;
  grant: PeopleAccessGrant | null;
  message: string | null;
}

interface PersonRouteState {
  peopleSelection?: boolean;
}

interface LockedPeopleViewProps {
  phase: UnlockPhase;
  message: string | null;
  configured: boolean;
  onUnlock: () => void;
}

interface PersonNameplateProps {
  contact: PeopleContact;
  selected: boolean;
  onSelect: () => void;
  depth: number;
}

interface PeopleWorldStageProps {
  contacts: PeopleContact[];
  matchedCount: number;
  selectedKey: string | null;
  onSelect: (contact: PeopleContact) => void;
}

interface RoomViewProps {
  rooms: PeopleReadSnapshot["dashboard"]["context"]["active_conversations"];
  query: string;
}

interface DetailSectionProps {
  title: string;
  count?: number;
  children: ReactNode;
}

interface ConversationListProps {
  rooms: PeoplePersonConversation[];
}

interface PersonInspectorProps {
  contact: PeopleContact;
  context: PeoplePersonContext | null;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  onClose: () => void;
  onAnalyze: () => void;
}

interface PeopleNameplateStyle extends CSSProperties {
  "--people-depth": number;
}

const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const PEOPLE_STAGE_LIMIT = 24;

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function selectedKeyFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("person");
}

function clearSelectedPersonUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("person");
  window.history.replaceState(null, "", url);
}

function contextLastActivity(context: PeoplePersonContext | null): string | null {
  return context?.conversations
    .map((conversation) => conversation.last_activity)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1) || null;
}

function contextContact(key: string, context: PeoplePersonContext | null): PeopleContact {
  const scopedContext = context?.identity.key === key ? context : null;
  const confirmed = !!scopedContext?.identity.person_id;
  const candidate = !confirmed && (scopedContext?.identity.candidate_count || 0) > 0;
  return {
    key,
    label: scopedContext?.identity.label || "Selected person",
    person_id: scopedContext?.identity.person_id || null,
    candidate_person_id: null,
    known: scopedContext?.identity.known || false,
    identity_status: confirmed ? "confirmed" : candidate ? "candidate" : "unresolved",
    channels: [...new Set(scopedContext?.identity.connected_identities.map((identity) => identity.channel) || [])],
    conversation_count: scopedContext?.conversations.length || 0,
    direct_conversation_count: scopedContext?.conversations.filter((conversation) => conversation.kind === "dm").length || 0,
    group_conversation_count: scopedContext?.groups.length || 0,
    messages_0_30d: 0,
    messages_31_60d: 0,
    messages_61_90d: 0,
    status: "recent",
    momentum: "steady",
    activity_signal: 0,
    last_activity: contextLastActivity(scopedContext),
  };
}

function boardUrl(): string {
  const url = new URL("/api/agora/", window.location.origin);
  if (activeHost) url.searchParams.set("host", activeHost);
  return url.toString();
}

function PeopleGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="10" r="4" />
      <circle cx="22" cy="13" r="3" />
      <path d="M4.5 25c.8-5.2 3.3-8 7.5-8s6.7 2.8 7.5 8" />
      <path d="M18 20c1.1-1.5 2.6-2.3 4.5-2.3 3 0 4.8 2.1 5.2 6.3" />
    </svg>
  );
}

function ArrowGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M12.7 4.3 7 10l5.7 5.7M7.5 10H17" />
    </svg>
  );
}

function LockGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function identityText(contact: PeopleContact): string {
  if (contact.identity_status === "confirmed") return "ยืนยันตัวตนแล้ว";
  if (contact.identity_status === "candidate") return "candidate · แยกตามบทสนทนา";
  return "ยังไม่ resolve";
}

function contactMessages(contact: PeopleContact): number {
  return contact.messages_0_30d + contact.messages_31_60d + contact.messages_61_90d;
}

function contactMatches(contact: PeopleContact, query: string): boolean {
  const haystack = [contact.label, ...contact.channels, contact.momentum, contact.status]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

function sameContact(contact: PeopleContact, key: string | null): boolean {
  return !!key && contact.key === key;
}

function LocalBoundaryNote(): ReactNode {
  return (
    <div className="people-boundary-note">
      <span className="people-boundary-dot" aria-hidden="true" />
      <span>ข้อมูลอยู่ใน People Oracle บนเครื่องนี้ · Cloudflare ไม่ proxy ข้อมูล</span>
    </div>
  );
}

function LockedPeopleView(props: LockedPeopleViewProps): ReactNode {
  const busy = props.phase === "unlocking";
  return (
    <main className="people-lock-stage">
      <section className="people-lock-copy" aria-labelledby="people-lock-title">
        <div className="people-lock-emblem"><LockGlyph /></div>
        <h1 id="people-lock-title">โลกของผู้คนยังล็อกอยู่</h1>
        <p className="people-lock-lede">
          Private local read: หน้า Stoa นี้เก็บ token ไว้ใน memory เท่านั้น เมื่ออนุมัติแล้วจะอ่านคน ห้อง และ context ได้ 20 นาที
          โดยไม่มีสิทธิ์เขียน อนุมัติ import export หรือส่งข้อความ
        </p>
        {!props.configured ? (
          <div className="people-lock-warning" role="alert">
            เพิ่ม <code>?peopleHost=http://localhost:47911</code> เพื่อระบุ People service บนเครื่องนี้อย่างชัดเจน
          </div>
        ) : null}
        {props.message ? <p className="people-lock-error" role="alert">{props.message}</p> : null}
        <button
          className="people-primary-action"
          type="button"
          disabled={!props.configured || busy}
          onClick={props.onUnlock}
        >
          {busy ? "กำลังรอการอนุมัติใน local tab…" : "ขอสิทธิ์อ่านชั่วคราว"}
        </button>
        <p className="people-lock-cli">หรือเปิดจาก CLI: <code>maw people open --stoa</code></p>
      </section>
      <aside className="people-lock-contract" aria-label="Read-only capability contract">
        <div><strong>01</strong><span>Origin ต้องอยู่ใน allowlist</span></div>
        <div><strong>02</strong><span>คนกดยืนยันบน localhost</span></div>
        <div><strong>03</strong><span>token หมดอายุและไม่ถูก persist</span></div>
        <div><strong>04</strong><span>Analyze อ่าน excerpt เฉพาะเมื่อคลิก</span></div>
      </aside>
    </main>
  );
}

function PersonNameplate(props: PersonNameplateProps): ReactNode {
  const style: PeopleNameplateStyle = { "--people-depth": props.depth };
  return (
    <button
      type="button"
      className={`people-nameplate people-nameplate--${props.contact.identity_status}${props.selected ? " is-selected" : ""}`}
      style={style}
      onClick={props.onSelect}
      aria-pressed={props.selected}
    >
      <span className="people-nameplate-name">{props.contact.label || "Unnamed observation"}</span>
      <span className="people-nameplate-meta">
        {identityText(props.contact)} · {formatNumber(contactMessages(props.contact))} msgs
      </span>
    </button>
  );
}

function PeopleWorldStage(props: PeopleWorldStageProps): ReactNode {
  const maxActivity = Math.max(1, ...props.contacts.map((contact) => contact.activity_signal));
  return (
    <div className="people-world-stage" aria-label="People in the current evidence window">
      <div className="people-stage-horizon" aria-hidden="true" />
      <div className="people-stage-copy">
        <strong>{props.contacts.length}</strong>
        <span>of {props.matchedCount} matched observations</span>
      </div>
      <div className="people-nameplate-field">
        {props.contacts.map((contact) => (
          <PersonNameplate
            key={contact.key || `${contact.label}-${contact.last_activity}`}
            contact={contact}
            selected={sameContact(contact, props.selectedKey)}
            depth={Math.max(0.18, contact.activity_signal / maxActivity)}
            onSelect={() => props.onSelect(contact)}
          />
        ))}
      </div>
    </div>
  );
}

function RoomView(props: RoomViewProps): ReactNode {
  const visible = props.rooms.filter((room) => (
    `${room.label || ""} ${room.channel} ${room.kind}`.toLocaleLowerCase()
      .includes(props.query.toLocaleLowerCase())
  ));
  return (
    <div className="people-room-ledger">
      <div className="people-room-ledger-head">
        <span>ห้องสนทนา</span><span>activity ในช่วงข้อมูล</span><span>last observed</span>
      </div>
      {visible.map((room) => (
        <div className="people-room-row" key={room.conversation_id || `${room.channel}-${room.label}`}>
          <div><strong>{room.label || "Unnamed room"}</strong><span>{room.channel} · {room.kind}</span></div>
          <span>{formatNumber(room.messages)} messages</span>
          <time>{formatDate(room.last_activity)}</time>
        </div>
      ))}
      {!visible.length ? <div className="people-empty-row">ไม่พบห้องที่ตรงกับคำค้น</div> : null}
    </div>
  );
}

function DetailSection(props: DetailSectionProps): ReactNode {
  return (
    <section className="people-detail-section">
      <h3>{props.title}{props.count === undefined ? null : <span>{props.count}</span>}</h3>
      {props.children}
    </section>
  );
}

function ConversationList(props: ConversationListProps): ReactNode {
  if (!props.rooms.length) return <p className="people-detail-empty">ยังไม่มีห้องที่เชื่อมใน scope นี้</p>;
  return (
    <div className="people-room-chips">
      {props.rooms.map((room) => (
        <div className="people-room-chip" key={room.conversation_id}>
          <strong>{room.label || "Unnamed room"}</strong>
          <span>{room.channel} · {room.kind} · {formatNumber(room.messages_in_window || 0)} msgs</span>
        </div>
      ))}
    </div>
  );
}

function PersonInspector(props: PersonInspectorProps): ReactNode {
  const context = props.context;
  return (
    <aside className="people-inspector" aria-label={`Context for ${props.contact.label || "selected person"}`}>
      <header className="people-inspector-head">
        <button className="people-icon-button" type="button" onClick={props.onClose} aria-label="Close person context">
          <ArrowGlyph />
        </button>
        <div>
          <p>{identityText(props.contact)}</p>
          <h2>{props.contact.label || "Unnamed observation"}</h2>
        </div>
        <span className={`people-identity-flag people-identity-flag--${props.contact.identity_status}`}>
          {props.contact.identity_status}
        </span>
      </header>

      <div className="people-inspector-scroll">
        <div className="people-person-pulse">
          <div><span>activity</span><strong>{formatNumber(contactMessages(props.contact))}</strong></div>
          <div><span>rooms</span><strong>{props.contact.conversation_count}</strong></div>
          <div><span>last seen</span><strong>{formatDate(props.contact.last_activity)}</strong></div>
        </div>

        {props.loading ? <div className="people-context-loading">กำลังประกอบ context จาก People Oracle…</div> : null}
        {props.error ? <p className="people-context-error" role="alert">{props.error}</p> : null}

        {context ? (
          <>
            <DetailSection title="ชื่อเล่น" count={context.nicknames.length}>
              {context.nicknames.length ? (
                <div className="people-tag-list">{context.nicknames.map((nickname) => <span key={nickname.entry_id}>{nickname.value}</span>)}</div>
              ) : <p className="people-detail-empty">ยังไม่มี nickname ที่อนุมัติ</p>}
            </DetailSection>

            <DetailSection title="ตัวตนข้ามแพลตฟอร์ม" count={context.identity.connected_identities.length}>
              <div className="people-identity-list">
                {context.identity.connected_identities.map((identity) => (
                  <div key={`${identity.channel}:${identity.native_key || identity.display_name}`}>
                    <strong>{identity.channel}</strong>
                    <span>{identity.display_name || "Native identity"}</span>
                    <small>{identity.status}</small>
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="ห้องที่เชื่อม" count={context.conversations.length}>
              <ConversationList rooms={context.conversations} />
            </DetailSection>

            <DetailSection title="Projects" count={context.projects.length}>
              {context.projects.length ? (
                <div className="people-project-list">{context.projects.map((project) => (
                  <div key={project.project_id}><strong>{project.title || project.project_id}</strong><span>{project.relationship}</span></div>
                ))}</div>
              ) : <p className="people-detail-empty">ยังไม่มี Project ที่เชื่อมอย่างอนุมัติ</p>}
            </DetailSection>

            <DetailSection title="Memory log" count={context.memory_timeline.length}>
              {context.memory_timeline.length ? (
                <ol className="people-memory-list">{context.memory_timeline.slice(0, 8).map((event) => (
                  <li key={event.entry_id}>
                    <time>{formatDate(event.created_at)}</time>
                    <strong>{event.display_label || event.relationship || event.kind}</strong>
                    {event.note ? <p>{event.note}</p> : null}
                    <small>{event.commit_sha256 ? event.commit_sha256.slice(0, 12) : "unhashed legacy entry"}</small>
                  </li>
                ))}</ol>
              ) : <p className="people-detail-empty">ยังไม่มี memory ที่คนอนุมัติ</p>}
            </DetailSection>

            <DetailSection title="GitHub memory repository">
              {context.github_repository.status === "linked" && context.github_repository.url ? (
                <a className="people-external-link" href={context.github_repository.url} target="_blank" rel="noreferrer">เปิด {context.github_repository.repository || "repository"}</a>
              ) : context.github_repository.create_url ? (
                <a className="people-external-link" href={context.github_repository.create_url} target="_blank" rel="noreferrer">เตรียมสร้าง {context.github_repository.suggested_name}</a>
              ) : <p className="people-detail-empty">ต้องเป็น confirmed person ก่อนจึงจะสร้าง repo อ้างอิงได้</p>}
            </DetailSection>

            <DetailSection title="Evidence on demand">
              {!context.evidence_sample ? (
                <div className="people-evidence-gate">
                  <p>ยังไม่ได้อ่านข้อความสนทนา การปลดล็อกหน้าไม่ได้เท่ากับยินยอมให้อ่าน evidence</p>
                  <button type="button" onClick={props.onAnalyze} disabled={props.analyzing}>
                    {props.analyzing ? "กำลังอ่าน excerpt แบบชั่วคราว…" : "Analyze 8 bounded excerpts"}
                  </button>
                </div>
              ) : (
                <div className="people-evidence-list">
                  <p>{context.evidence_sample.warning}</p>
                  {context.evidence_sample.excerpts.map((excerpt) => (
                    <blockquote key={excerpt.evidence_locator}>
                      <span>{excerpt.channel} · {excerpt.speaker_role} · {formatDate(excerpt.timestamp)}</span>
                      <p>{excerpt.text}</p>
                    </blockquote>
                  ))}
                </div>
              )}
            </DetailSection>
          </>
        ) : null}
      </div>
    </aside>
  );
}

export default function PeoplePage({ bootstrapCode }: PeoplePageProps): ReactNode {
  const { theme, toggleTheme } = useTheme();
  const bootstrapStarted = useRef(false);
  const analysisRequestRef = useRef(0);
  const selectedKeyRef = useRef<string | null>(null);
  const [unlock, setUnlock] = useState<UnlockState>({ phase: "locked", grant: null, message: null });
  const [days, setDays] = useState<PeopleWindowDays>(90);
  const [mode, setMode] = useState<PeopleViewMode>("people");
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<PeopleReadSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => selectedKeyFromUrl());
  const [context, setContext] = useState<PeoplePersonContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  selectedKeyRef.current = selectedKey;

  const setGrant = useCallback((grant: PeopleAccessGrant): void => {
    setUnlock({ phase: "granted", grant, message: null });
  }, []);

  useEffect(() => {
    document.title = "STOA · People";
  }, []);

  useEffect(() => {
    if (!bootstrapCode || bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    if (!peopleHostConfigured()) {
      setUnlock({ phase: "error", grant: null, message: "CLI bootstrap arrived without an explicit peopleHost." });
      return;
    }
    setUnlock({ phase: "unlocking", grant: null, message: "กำลังแลก one-time CLI bootstrap…" });
    void exchangePeopleBootstrap(bootstrapCode)
      .then((grant) => setGrant(grant))
      .catch((cause) => {
        setUnlock({
          phase: "error",
          grant: null,
          message: cause instanceof Error ? cause.message : "CLI bootstrap failed",
        });
      });
  }, [bootstrapCode, setGrant]);

  useEffect(() => {
    const expiresAt = unlock.grant ? new Date(unlock.grant.expires_at).valueOf() : 0;
    if (!expiresAt) return;
    const timeout = window.setTimeout(() => {
      clearSelectedPersonUrl();
      setSelectedKey(null);
      setUnlock({ phase: "locked", grant: null, message: "สิทธิ์อ่านหมดอายุแล้ว" });
      setSnapshot(null);
      setContext(null);
    }, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [unlock.grant]);

  useEffect(() => {
    const onPopState = (): void => setSelectedKey(selectedKeyFromUrl());
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !selectedKey) return;
      const state = window.history.state as PersonRouteState | null;
      if (state?.peopleSelection) window.history.back();
      else {
        clearSelectedPersonUrl();
        setSelectedKey(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKey]);

  useEffect(() => {
    analysisRequestRef.current += 1;
    setAnalyzing(false);
  }, [selectedKey]);

  useEffect(() => {
    const token = unlock.grant?.access_token;
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    void loadPeopleSnapshot(token, days)
      .then((value) => { if (!cancelled) setSnapshot(value); })
      .catch((cause) => {
        if (!cancelled) {
          clearSelectedPersonUrl();
          setSelectedKey(null);
          setUnlock({
            phase: "error",
            grant: null,
            message: cause instanceof Error ? cause.message : "People snapshot failed",
          });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, unlock.grant?.access_token]);

  const matchingContacts = useMemo(() => {
    const source = snapshot?.dashboard.context.current_circle || [];
    return query.trim() ? source.filter((contact) => contactMatches(contact, query.trim())) : source;
  }, [query, snapshot]);

  const stageContacts = useMemo(
    () => matchingContacts.slice(0, PEOPLE_STAGE_LIMIT),
    [matchingContacts],
  );

  const selectedContact = useMemo(() => {
    if (!selectedKey) return null;
    return snapshot?.dashboard.context.current_circle.find((contact) => sameContact(contact, selectedKey))
      || contextContact(selectedKey, context);
  }, [context, selectedKey, snapshot]);
  const selectedContext = context?.identity.key === selectedKey ? context : null;

  useEffect(() => {
    const token = unlock.grant?.access_token;
    if (!token || !selectedKey) {
      setContext(null);
      setContextError(null);
      return;
    }
    let cancelled = false;
    setContext(null);
    setContextLoading(true);
    setContextError(null);
    void loadPersonContext(token, { key: selectedKey, days, analyze: false })
      .then((value) => { if (!cancelled) setContext(value); })
      .catch((cause) => {
        if (!cancelled) setContextError(cause instanceof Error ? cause.message : "Could not load person context");
      })
      .finally(() => { if (!cancelled) setContextLoading(false); });
    return () => { cancelled = true; };
  }, [days, selectedKey, unlock.grant?.access_token]);

  const unlockFromWeb = useCallback(async (): Promise<void> => {
    const popup = window.open("about:blank", "people-local-unlock", "popup,width=620,height=720");
    if (!popup) {
      setUnlock({
        phase: "error",
        grant: null,
        message: "Browser blocked the local confirmation window. Allow pop-ups for Stoa and try again.",
      });
      return;
    }
    setUnlock({ phase: "unlocking", grant: null, message: null });
    try {
      const ticket = await requestPeopleUnlock();
      if (popup) popup.location.href = ticket.approve_url;
      const deadline = new Date(ticket.expires_at).valueOf();
      while (Date.now() < deadline) {
        const result = await pollPeopleUnlock(ticket);
        if (result.status === "granted") {
          try { popup?.close(); } catch { /* the local confirmation tab can stay open */ }
          setGrant(result);
          return;
        }
        if (result.status === "denied") {
          setUnlock({ phase: "locked", grant: null, message: "คำขอถูกปฏิเสธ ไม่มีข้อมูลถูกเปิด" });
          return;
        }
        await sleep(700);
      }
      throw new Error("คำขอปลดล็อกหมดอายุแล้ว ลองใหม่อีกครั้ง");
    } catch (cause) {
      try { popup?.close(); } catch { /* already closed */ }
      setUnlock({
        phase: "error",
        grant: null,
        message: cause instanceof Error ? cause.message : "Could not unlock People",
      });
    }
  }, [setGrant]);

  const selectContact = useCallback((contact: PeopleContact): void => {
    if (!contact.key) return;
    const url = new URL(window.location.href);
    url.searchParams.set("person", contact.key);
    if (selectedKey) {
      const state = window.history.state as PersonRouteState | null;
      window.history.replaceState(state, "", url);
    } else {
      window.history.pushState({ peopleSelection: true } satisfies PersonRouteState, "", url);
    }
    setSelectedKey(contact.key);
  }, [selectedKey]);

  const closePerson = useCallback((): void => {
    const state = window.history.state as PersonRouteState | null;
    if (state?.peopleSelection) window.history.back();
    else {
      clearSelectedPersonUrl();
      setSelectedKey(null);
    }
  }, []);

  const analyze = useCallback(async (): Promise<void> => {
    const token = unlock.grant?.access_token;
    if (!token || !selectedKey) return;
    const requestedKey = selectedKey;
    const requestId = ++analysisRequestRef.current;
    setAnalyzing(true);
    setContextError(null);
    try {
      const result = await loadPersonContext(token, {
        key: requestedKey,
        days,
        analyze: true,
        max_excerpts: 8,
        max_chars: 4_000,
      });
      if (analysisRequestRef.current === requestId && selectedKeyRef.current === requestedKey) setContext(result);
    } catch (cause) {
      if (analysisRequestRef.current === requestId && selectedKeyRef.current === requestedKey) {
        setContextError(cause instanceof Error ? cause.message : "Evidence read failed");
      }
    } finally {
      if (analysisRequestRef.current === requestId && selectedKeyRef.current === requestedKey) setAnalyzing(false);
    }
  }, [days, selectedKey, unlock.grant?.access_token]);

  const lock = useCallback(async (): Promise<void> => {
    const token = unlock.grant?.access_token;
    clearSelectedPersonUrl();
    setSelectedKey(null);
    setUnlock({ phase: "locked", grant: null, message: null });
    setSnapshot(null);
    setContext(null);
    if (token) {
      try { await revokePeopleAccess(token); } catch { /* expiry/revocation is already fail-closed */ }
    }
  }, [unlock.grant?.access_token]);

  const granted = unlock.phase === "granted" && !!unlock.grant;
  const observedThrough = snapshot?.dashboard.context.sources
    .map((source) => source.observed_through)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1) || null;

  return (
    <div className="people-page">
      <header className="people-topbar">
        <a className="people-brand" href={boardUrl()}>
          <span className="people-brand-mark"><PeopleGlyph /></span>
          <span><strong>STOA / PEOPLE</strong><small>private read projection</small></span>
        </a>
        <div className="people-topbar-center">โลกของผู้คน</div>
        <div className="people-topbar-actions">
          <span className={`people-access-state ${granted ? "is-live" : ""}`}>
            <i aria-hidden="true" />{granted ? `read until ${formatDate(unlock.grant?.expires_at || null)}` : "locked"}
          </span>
          {granted ? <button type="button" onClick={() => void lock()}>Lock now</button> : null}
        </div>
      </header>

      {!granted ? (
        <>
          <LockedPeopleView
            phase={unlock.phase}
            message={unlock.message}
            configured={peopleHostConfigured()}
            onUnlock={() => void unlockFromWeb()}
          />
          <footer className="people-lock-footer"><LocalBoundaryNote /></footer>
        </>
      ) : (
        <main className={`people-workspace${selectedContact ? " has-inspector" : ""}`}>
          <section className="people-workspace-head">
            <div>
              <h1>ใครกำลังอยู่ในวงชีวิตตอนนี้?</h1>
              <span>Evidence window ไม่ใช่คะแนนความสัมพันธ์ · ขอบข้อมูลล่าสุด {formatDate(observedThrough)} · candidate ยังแยกตาม conversation</span>
            </div>
            <div className="people-controls">
              <div className="people-segmented" aria-label="View">
                <button type="button" className={mode === "people" ? "is-active" : ""} onClick={() => setMode("people")}>People world</button>
                <button type="button" className={mode === "rooms" ? "is-active" : ""} onClick={() => setMode("rooms")}>Chat rooms</button>
              </div>
              <label className="people-search">
                <span className="sr-only">ค้นหาคนหรือห้อง</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ คน หรือห้อง" />
              </label>
              <div className="people-window-control" aria-label="Evidence window">
                {([30, 60, 90] as const).map((value) => (
                  <button type="button" key={value} className={days === value ? "is-active" : ""} onClick={() => setDays(value)}>{value}d</button>
                ))}
              </div>
            </div>
          </section>

          <section className="people-data-strip">
            <div><span>people in view</span><strong>{snapshot?.dashboard.context.current_circle_count || 0}</strong></div>
            <div><span>on stage</span><strong>{stageContacts.length}</strong></div>
            <div><span>active rooms</span><strong>{snapshot?.dashboard.context.active_conversations.length || 0}</strong></div>
            <LocalBoundaryNote />
          </section>

          <div className="people-surface">
            <section className="people-stage-panel">
              <div className="people-stage-heading">
                <div>
                  <strong>{mode === "people" ? "Character stage" : "Conversation ledger"}</strong>
                  <span>{loading ? "refreshing…" : mode === "people" ? `top ${stageContacts.length} by recent activity · search scans ${matchingContacts.length} loaded` : "Esc closes selected context · browser Back works"}</span>
                </div>
                <span>{mode === "people" ? `${stageContacts.length} of ${matchingContacts.length} people` : `${snapshot?.dashboard.context.active_conversations.length || 0} rooms`}</span>
              </div>
              {mode === "people" ? (
                <PeopleWorldStage
                  contacts={stageContacts}
                  matchedCount={matchingContacts.length}
                  selectedKey={selectedKey}
                  onSelect={selectContact}
                />
              ) : (
                <RoomView rooms={snapshot?.dashboard.context.active_conversations || []} query={query} />
              )}
            </section>

            {selectedContact ? (
              <PersonInspector
                contact={selectedContact}
                context={selectedContext}
                loading={contextLoading}
                analyzing={analyzing}
                error={contextError}
                onClose={closePerson}
                onAnalyze={() => void analyze()}
              />
            ) : null}
          </div>
        </main>
      )}
      <StatusBar
        items={[]}
        usage={null}
        theme={theme}
        onToggleTheme={toggleTheme}
        showFleetMetrics={false}
        statusText="People capability · browser-direct · read-only"
      />
    </div>
  );
}
