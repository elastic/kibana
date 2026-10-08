/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Executive Brief PoC contract. Shared by the server snapshot / storyline builder / generator
 * and the flyout UI. Every lane builds against these types and the fixtures in `__fixtures__`.
 * Do not change without telling the orchestrator.
 */

// ---------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------

export type BriefEntityType = 'user' | 'host' | 'service' | 'generic';
export type BriefSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BriefConfidence = 'high' | 'medium' | 'low';
export type BriefRiskLevel = 'Critical' | 'High' | 'Moderate' | 'Low' | 'Unknown';
export type BriefTimeRangeKey = '24h' | '7d' | '30d';

export interface BriefTimeRange {
  /** ISO timestamp. */
  from: string;
  /** ISO timestamp; also the fixed "now" used by every snapshot query. */
  to: string;
  range: BriefTimeRangeKey;
}

export interface TimePoint {
  /** ISO timestamp. */
  t: string;
  v: number;
}

/**
 * Evidence IDs are the only way the LLM may reference facts.
 * ENT entity · RULE detection rule · AD attack discovery · LEAD hunting lead · CASE case ·
 * ANOM ML anomaly group · TAC MITRE tactic (e.g. TAC-TA0008) · GAP blind-spot signal (e.g. GAP-B5) ·
 * STORY storyline · EVT storyline timeline event.
 */
export type EvidenceKind =
  | 'ENT'
  | 'RULE'
  | 'AD'
  | 'LEAD'
  | 'CASE'
  | 'ANOM'
  | 'TAC'
  | 'GAP'
  | 'STORY'
  | 'EVT';
export type EvidenceId = `${EvidenceKind}-${string}`;

// ---------------------------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------------------------

export interface BriefEntity {
  evidenceId: `ENT-${string}`;
  /** Golden (resolved) entity id. Aliases are collapsed into this entity. */
  euid: string;
  type: BriefEntityType;
  /** Display name. Omitted from the LLM payload in `ids_only` mode. */
  name: string;
  riskScoreNorm?: number;
  riskLevel?: BriefRiskLevel;
  /** e.g. extreme_impact | high_impact | medium_impact | low_impact */
  criticality?: string;
  watchlists: string[];
  isPrivileged: boolean;
  /** Alias euids resolved to this golden entity (e.g. host-scoped local users). */
  aliases: string[];
  vulnerabilities?: { critical: number; high: number };
  /** Daily max normalised risk over the window, oldest first. */
  riskTrend?: TimePoint[];
  /** True when the entity is treated as shared infrastructure (hub guard). */
  isHub?: boolean;
}

// ---------------------------------------------------------------------------------------------
// At a glance
// ---------------------------------------------------------------------------------------------

export type GlanceStatId =
  | 'postureScore'
  | 'materialRiskEntities'
  | 'activeSignals'
  | 'stagesWithActivity';

export interface GlanceStat {
  id: GlanceStatId;
  value: number;
  previous?: number;
  delta?: number;
  /** All glance stats are "up is bad"; kept explicit so the delta badge colours correctly. */
  upIsBad: boolean;
}

/** Mirrors `SignalCardId` in the Needs Attention tiles. */
export type NeedsAttentionCardId =
  | 'entitiesWithAlerts'
  | 'entitiesWithAnomalies'
  | 'riskMovers'
  | 'newlyHighCritical'
  | 'watchlisted'
  | 'newEntity';

export type SourceStatus = 'ok' | 'timeout' | 'error' | 'missing_index' | 'disabled';

export interface NeedsAttentionTileSnapshot {
  id: NeedsAttentionCardId;
  status: SourceStatus;
  count: number;
  previousCount?: number;
  delta?: number;
  /** Omitted when previousCount is 0. */
  deltaPct?: number;
  trend?: TimePoint[];
  /** Capped, ranked sample of golden euids. Never the full id list. */
  sample: string[];
  sampleTruncated: boolean;
}

export interface RiskConcentrationCell {
  type: BriefEntityType;
  level: BriefRiskLevel;
  count: number;
}

export interface BriefGlance {
  stats: GlanceStat[];
  needsAttention: NeedsAttentionTileSnapshot[];
  /** Built from returned buckets only (some entity types may not be installed). */
  concentration: RiskConcentrationCell[];
  /** Top euids by normalised risk (max 10). */
  exposureLeaders: string[];
}

// ---------------------------------------------------------------------------------------------
// Storylines (deterministic builder; PLAN §3.8)
// ---------------------------------------------------------------------------------------------

export type SeedKind = 'attack_discovery' | 'lead' | 'material_risk' | 'risk_mover';

export interface StorySeed {
  kind: SeedKind;
  /** Source evidence (AD-*, LEAD-*, ENT-*). */
  evidenceId: EvidenceId;
  entityEuids: string[];
  /** Normalised 0..1. */
  severity: number;
  /** ISO timestamp of the latest supporting activity. */
  at: string;
}

export type StoryEdgeType =
  | 'same_ad'
  | 'co_alert'
  | 'owns'
  | 'administers'
  | 'accesses_infrequently'
  | 'lead_related'
  | 'accesses_frequently'
  | 'communicates_with'
  | 'supervises';

/** merge = may union two seeds; attach = may add an entity to a storyline; context = display only. */
export type StoryEdgeRole = 'merge' | 'attach' | 'context';

export interface StoryEdge {
  type: StoryEdgeType;
  /** Golden euid. */
  from: string;
  /** Golden euid. */
  to: string;
  weight: number;
  /** Supporting facts (RULE-*, AD-*, LEAD-*, EVT-*). */
  evidenceIds: EvidenceId[];
}

export type StoryEventType =
  | 'alert_first'
  | 'ad_generated'
  | 'lead_created'
  | 'risk_jump'
  | 'relationship_first_seen'
  | 'case_opened'
  | 'case_status'
  | 'alerts_closed';

export interface StoryEvent {
  evidenceId: `EVT-${string}`;
  type: StoryEventType;
  /** ISO timestamp. */
  at: string;
  entityEuids: string[];
  tacticId?: string;
  /** Deterministic, human-readable summary (no LLM). */
  summary: string;
  sourceEvidenceIds: EvidenceId[];
}

export type ResponseState = 'unaddressed' | 'in_progress' | 'contained';

export interface StoryCaseRef {
  evidenceId: `CASE-${string}`;
  caseId: string;
  title: string;
  status: 'open' | 'in-progress' | 'closed';
}

export interface StoryResponse {
  state: ResponseState;
  cases: StoryCaseRef[];
  alerts: { open: number; acknowledged: number; closed: number };
}

export type LinkStrength = 'strong' | 'moderate' | 'weak';

export interface Storyline {
  evidenceId: `STORY-${number}`;
  /** 1-based rank after scoring. */
  rank: number;
  score: number;
  severity: BriefSeverity;
  /** Golden euids, seeds first (max 8). */
  entityEuids: string[];
  /** Shared-infrastructure entities attached but never bridging. */
  hubEuids: string[];
  seeds: StorySeed[];
  edges: StoryEdge[];
  /** Time-ordered (max 12). */
  events: StoryEvent[];
  eventsTruncated: number;
  /** Tactic ids observed in this storyline, kill-chain ordered. */
  tacticIds: string[];
  /** strong: AD or co_alert merge; moderate: relationship merge; weak: attach-only links. */
  linkStrength: LinkStrength;
  response: StoryResponse;
}

export interface ClusterTraceStep {
  action: 'union' | 'attach' | 'skip_hub' | 'cap_entities' | 'cap_events' | 'drop_rank';
  detail: string;
}

export interface StorylinesResult {
  storylines: Storyline[];
  /** Seed euids that did not make a storyline. */
  otherNotableEntities: string[];
  /** Debug trace of union-find decisions (PoC debug panel). */
  trace: ClusterTraceStep[];
}

// ---------------------------------------------------------------------------------------------
// Blind spots (PLAN §3.9, investigation 08)
// ---------------------------------------------------------------------------------------------

export type AttackStageFlag = 'none' | 'limited_coverage' | 'no_working_detection';

export interface AttackStage {
  evidenceId: `TAC-${string}`;
  /** MITRE tactic id, e.g. TA0008. Always keyed by id (v19 renamed TA0005). */
  tacticId: string;
  tacticName: string;
  /** Managed MITRE ordering. */
  position: number;
  /** Pairing-safe: resolved from the rule's own `params.threat`. */
  topTechnique?: { id: string; name: string };
  observed: { alerts: number; attackDiscoveries: number; mlAnomalies: number };
  coverage: {
    enabled: number;
    /** enabled − (only uninstalled integrations) − (last run failed) */
    effective: number;
  };
  flag: AttackStageFlag;
  topRuleEvidenceIds: Array<`RULE-${string}`>;
}

export interface AttackStagesSummary {
  stages: AttackStage[];
  unmapped: { alerts: number; share: number; topRuleEvidenceIds: Array<`RULE-${string}`> };
}

export type BlindSpotSignalId =
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'B9'
  | 'B10'
  | 'B11'
  | 'B12'
  | 'B13'
  | 'B14'
  | 'B15'
  | 'B16'
  | 'B17';

export type BlindSpotGroup =
  | 'detection_coverage'
  | 'data_not_collected'
  | 'analytics_not_running'
  | 'context_missing'
  | 'attribution_gap'
  | 'response_gap';

export interface BlindSpotGap {
  evidenceId: `GAP-${BlindSpotSignalId}`;
  signal: BlindSpotSignalId;
  group: BlindSpotGroup;
  severity: 'danger' | 'warning' | 'info';
  /** Deterministic short title, e.g. "No asset criticality on 3 material-risk entities". */
  title: string;
  value?: number;
  detail?: string;
  /** App-relative deep link, e.g. /app/security/entity_analytics_asset_criticality */
  fixHref?: string;
  fixLabel?: string;
  /** Entities the gap applies to (golden euids), when relevant. */
  entityEuids?: string[];
}

export interface BriefBlindSpots {
  attackStages: AttackStagesSummary;
  gaps: BlindSpotGap[];
}

// ---------------------------------------------------------------------------------------------
// Evidence catalog
// ---------------------------------------------------------------------------------------------

export type EvidenceEntry =
  | { kind: 'entity'; euid: string }
  | {
      kind: 'rule';
      ruleId: string;
      name: string;
      severity: BriefSeverity;
      alertCount: number;
      tacticIds: string[];
      techniqueIds: string[];
    }
  | {
      kind: 'attack_discovery';
      id: string;
      title: string;
      riskScore?: number;
      workflowStatus: 'open' | 'acknowledged' | 'closed';
      alertCount: number;
      tacticIds: string[];
    }
  | { kind: 'lead'; id: string; title: string; priority: number; status: string }
  | { kind: 'case'; caseId: string; title: string; status: 'open' | 'in-progress' | 'closed' }
  | { kind: 'anomaly'; jobId: string; maxScore: number; count: number; tacticIds: string[] }
  | { kind: 'tactic'; tacticId: string }
  | { kind: 'gap'; signal: BlindSpotSignalId }
  | { kind: 'story'; rank: number }
  | { kind: 'event'; storyEvidenceId: `STORY-${number}` };

export type EvidenceCatalog = Record<EvidenceId, EvidenceEntry>;

// ---------------------------------------------------------------------------------------------
// Snapshot (everything deterministic; input to the generator)
// ---------------------------------------------------------------------------------------------

export interface BriefSnapshot {
  spaceId: string;
  /** The single fixed "now" used by every query. */
  generatedAt: string;
  timeRange: BriefTimeRange;
  glance: BriefGlance;
  storylines: StorylinesResult;
  blindSpots: BriefBlindSpots;
  /** All entities referenced anywhere in the snapshot, keyed by golden euid. */
  entities: Record<string, BriefEntity>;
  catalog: EvidenceCatalog;
  /** Per-source status so a failed source becomes a gap, not an error. */
  sources: Record<string, { status: SourceStatus; tookMs: number; message?: string }>;
}

// ---------------------------------------------------------------------------------------------
// Generated brief (LLM or template output; PLAN §3.2)
// ---------------------------------------------------------------------------------------------

export interface ExecutiveBriefStoryline {
  storylineId: `STORY-${number}`;
  title: string;
  narrative: string;
  whyItMatters: string;
  confidence: BriefConfidence;
  evidence: EvidenceId[];
}

export type DecisionOwner = 'soc' | 'it' | 'iam' | 'cloud' | 'detection_engineering' | 'leadership';

export interface ExecutiveBriefDecision {
  action: string;
  rationale: string;
  urgency: 'now' | 'this_week' | 'next_review';
  owner?: DecisionOwner;
  /** STORY-*, GAP-* or TAC-* */
  relatesTo: EvidenceId;
  targets: EvidenceId[];
  evidence: EvidenceId[];
  /** Seeds "Investigate with AI Agent". */
  agentPrompt: string;
}

export interface ExecutiveBrief {
  glance: { headline: string; threatNarrative: string; evidence: EvidenceId[] };
  storylines: ExecutiveBriefStoryline[];
  crossStorylineConclusion?: {
    statement: string;
    confidence: BriefConfidence;
    evidence: EvidenceId[];
  };
  blindSpots: { summary: string; evidence: EvidenceId[] };
  decisions: ExecutiveBriefDecision[];
  changeSummary?: string;
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

export interface BriefValidation {
  totalClaims: number;
  droppedClaims: number;
  invalidEvidenceIds: string[];
  /** Sentences linking two entities with no computed edge (or a stronger verb than allowed). */
  unbackedRelations: Array<{ statement: string; from: string; to: string }>;
  /** Numbers in prose that do not appear in snapshot metrics. */
  inventedNumbers: string[];
}

// ---------------------------------------------------------------------------------------------
// Job + API
// ---------------------------------------------------------------------------------------------

export type BriefGeneratorKind = 'template' | 'inference';
export type BriefNarrationMode = 'names' | 'ids_only';

export type BriefJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';
export type BriefJobStage =
  | 'snapshot'
  | 'storylines'
  | 'blind_spots'
  | 'generate'
  | 'validate'
  | 'persist';

export interface GenerateBriefRequestBody {
  timeRange: BriefTimeRange;
  generator: BriefGeneratorKind;
  mode: BriefNarrationMode;
  connectorId?: string;
}

export interface GenerateBriefResponse {
  id: string;
  status: BriefJobStatus;
}

export interface ExecutiveBriefJob {
  id: string;
  spaceId: string;
  status: BriefJobStatus;
  stage?: BriefJobStage;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: { username: string };
  params: GenerateBriefRequestBody;
  snapshot?: BriefSnapshot;
  brief?: ExecutiveBrief;
  validation?: BriefValidation;
  /** Milliseconds per stage. */
  timings?: Partial<Record<BriefJobStage, number>>;
  tokens?: { prompt: number; completion: number };
  error?: {
    code: 'interrupted' | 'timeout' | 'connector' | 'llm_output' | 'unknown';
    message: string;
  };
}
