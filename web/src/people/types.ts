export type PeopleIdentityStatus = "confirmed" | "candidate" | "unresolved";
export type PeopleContactStatus = "active" | "recent" | "fading";
export type PeopleMomentum = "steady" | "new-to-current-window" | "rising" | "cooling" | "fading";
export type PeopleGraphNodeKind = "person" | "actor" | "conversation" | "project";

export interface PeopleSourceCoverage {
  source_id: string;
  channel: string;
  source_kind: string;
  observed_through: string | null;
  timestamp_coverage: number;
  coverage_note: string;
}

export interface PeopleContact {
  key?: string;
  label: string | null;
  person_id?: string | null;
  candidate_person_id?: string | null;
  known: boolean;
  identity_status: PeopleIdentityStatus;
  channels: string[];
  conversation_count: number;
  direct_conversation_count: number;
  group_conversation_count: number;
  messages_0_30d: number;
  messages_31_60d: number;
  messages_61_90d: number;
  status: PeopleContactStatus;
  momentum: PeopleMomentum;
  activity_signal: number;
  last_activity: string | null;
}

export interface PeopleConversationSummary {
  conversation_id?: string;
  label: string | null;
  channel: string;
  kind: string;
  messages: number;
  known_people: number;
  last_activity: string | null;
}

export interface PeopleContextSummary {
  window_days: number;
  current_circle_count: number;
  current_circle_returned: number;
  current_circle: PeopleContact[];
  active_conversations: PeopleConversationSummary[];
  sources: PeopleSourceCoverage[];
  epistemic_limits: string[];
}

export interface PeopleDashboard {
  context: PeopleContextSummary;
}

export interface PeopleGraphNode {
  id: string;
  kind: PeopleGraphNodeKind;
  label: string | null;
  index: number;
  identity_status?: PeopleIdentityStatus;
  candidate_person_id?: string | null;
  status?: string;
  momentum?: PeopleMomentum;
  activity?: number;
  conversation_kind?: string;
  channel?: string;
}

export interface PeopleGraphEdge {
  source: string;
  type: string;
  target: string;
  derived: boolean;
  confidence?: number | null;
  evidence?: string;
}

export interface PeopleGraph {
  schema: "people-oracle/social-graph@1";
  window_days: number;
  nodes: PeopleGraphNode[];
  edges: PeopleGraphEdge[];
  warning: string;
}

export interface PeopleConnectedIdentity {
  channel: string;
  native_key: string | null;
  display_name: string | null;
  confidence: number | null;
  status: "confirmed-authority" | "conversation-scoped-observation";
  evidence: string;
}

export interface PeoplePersonIdentity {
  key: string;
  status: "resolved" | "unresolved" | "requires-person-selection";
  known: boolean;
  person_id: string | null;
  label: string | null;
  aliases: string[];
  connected_identities: PeopleConnectedIdentity[];
  candidate_count: number;
  rule: string;
}

export interface PeopleMemoryEvent {
  entry_id: number;
  kind: string;
  relationship: string | null;
  note: string | null;
  display_label: string | null;
  tags: string[];
  evidence: string;
  created_at: string | null;
  is_current: boolean;
  commit_sha256: string | null;
}

export interface PeoplePersonConversation {
  conversation_id: string;
  channel: string;
  kind: string;
  label: string | null;
  messages_in_window: number | null;
  last_activity: string | null;
  evidence: string;
}

export interface PeopleProject {
  project_id: string;
  title: string | null;
  relationship: string;
}

export interface PeopleNickname {
  value: string;
  evidence: string;
  entry_id: number;
}

export interface PeopleGitHubRepository {
  status: "linked" | "missing" | "requires-confirmed-person";
  url: string | null;
  repository: string | null;
  suggested_name: string | null;
  create_url: string | null;
  rule: string;
}

export interface PeopleEvidenceExcerpt {
  channel: string;
  conversation_key: string;
  conversation_kind: string;
  speaker_role: "self" | "person";
  timestamp: string;
  text: string;
  evidence_locator: string;
  source: string;
}

export interface PeopleEvidencePacket {
  returned_excerpts?: number;
  characters_returned?: number;
  excerpts: PeopleEvidenceExcerpt[];
  warning: string;
}

export interface PeoplePersonContext {
  schema: "people-oracle/person-context@2";
  generated_at: string;
  window_days: 30 | 60 | 90;
  identity: PeoplePersonIdentity;
  github_repository: PeopleGitHubRepository;
  nicknames: PeopleNickname[];
  approved_context: PeopleMemoryEvent[];
  memory_timeline: PeopleMemoryEvent[];
  conversations: PeoplePersonConversation[];
  groups: PeoplePersonConversation[];
  projects: PeopleProject[];
  evidence_sample: PeopleEvidencePacket | null;
  epistemic_limits: string[];
}

export interface PeopleUnlockTicket {
  request_id: string;
  poll_token: string;
  approve_url: string;
  expires_at: string;
}

export interface PeopleAccessGrant {
  status: "granted";
  access_token: string;
  scope: "people:read";
  expires_at: string;
}

export interface PeoplePendingUnlock {
  status: "pending";
  expires_at: string;
}

export interface PeopleDeniedUnlock {
  status: "denied";
}

export type PeopleUnlockResult = PeopleAccessGrant | PeoplePendingUnlock | PeopleDeniedUnlock;

export interface PeopleApiSuccess<T> {
  ok: true;
  data: T;
}

export interface PeopleApiFailure {
  ok: false;
  error: string;
  reason?: string;
}

export type PeopleApiEnvelope<T> = PeopleApiSuccess<T> | PeopleApiFailure;
