export type InboundTrigger = 'alert' | 'manual' | 'scheduled' | 'http_webhook';

export type GapBucket =
  | 'platform_primitive_gap'
  | 'connector_gap'
  | 'mapping_debt'
  | null;

export type ApprovalType = 'vendor_dependent' | 'elastic_native' | 'analyst_judgment' | null;

export type ElasticMatch = 'stack_connector' | 'connector_spec' | 'none';

export type ElasticStability = 'ga' | 'tech_preview' | null;

export interface ElasticJoin {
  match: ElasticMatch;
  connectorId: string | null;
}

export interface PlaybookInput {
  key: string;
  required: boolean;
  description: string;
}

export interface PlaybookOutput {
  contextPath: string;
  description: string;
}

export interface NextHops {
  label: string;
  destIds: string[];
}

export interface PlaybookTask {
  id: string;
  type: string;
  name: string;
  description: string;
  script: string | null;
  brandRaw: string | null;
  scriptName: string | null;
  playbookName: string | null;
  isCommand: boolean;
  skipunavailable: boolean;
  isOptional: boolean;
  hasTimerTriggers: boolean;
  next: NextHops[];
  conditions: unknown;
}

export interface AnnotatedTask extends PlaybookTask {
  connectorBrand: string | null;
  brandRawResolved: string | null;
  command: string | null;
  isCritical: boolean;
  isBlocker: boolean;
  gapBucket: GapBucket;
  approvalType: ApprovalType;
  elasticMatch: ElasticMatch | null;
  elasticConnectorId: string | null;
  elasticStability: ElasticStability;
  kibanaStepType: string | null;
}

export interface ConnectorUsage {
  brand: string;
  brandRaw: string;
  commands: string[];
  taskCount: number;
  isOptional: boolean;
  elasticMatch: ElasticMatch;
  elasticConnectorId: string | null;
}

export interface ApprovalRecord {
  taskName: string;
  approvalType: NonNullable<ApprovalType>;
  isCritical: boolean;
}

export interface PlaybookIR {
  pack: string;
  packName: string;
  file: string;
  id: string;
  name: string;
  description: string;
  fromversion: string | null;
  system: boolean;
  deprecated: boolean;
  inboundTrigger: InboundTrigger;
  startTaskId: string | null;
  inputs: PlaybookInput[];
  outputs: PlaybookOutput[];
  tasks: AnnotatedTask[];
  nestedPlaybooks: string[];
  connectors: ConnectorUsage[];
  stepCounts: Record<string, number>;
  hasParallelFanout: boolean;
  hasHumanApproval: boolean;
  hasMl: boolean;
  blockerGapCount: number;
  nonBlockerGapCount: number;
  isBlocked: boolean;
  approvals: ApprovalRecord[];
}

export interface InventoryFile {
  generated_at: string;
  source_root: string;
  filters: { deprecated: false; excluded_packs: string[] };
  summary: {
    playbooks: number;
    packs: number;
    connector_brands: number;
    triggers: Record<InboundTrigger, number>;
  };
  playbooks: InventoryPlaybook[];
}

export interface InventoryPlaybook {
  pack: string;
  pack_name: string;
  file: string;
  id: string;
  name: string;
  description: string;
  fromversion: string | null;
  system: boolean;
  deprecated: boolean;
  inbound_trigger: InboundTrigger;
  inputs: PlaybookInput[];
  outputs: PlaybookOutput[];
  nested_playbooks: string[];
  connectors: Array<{
    brand: string;
    brand_raw: string;
    commands: string[];
    task_count: number;
    is_optional: boolean;
    elastic_match: ElasticMatch;
    elastic_connector_id: string | null;
  }>;
  step_counts: Record<string, number>;
  has_parallel_fanout: boolean;
  has_human_approval: boolean;
  has_ml: boolean;
  is_blocked: boolean;
  blocker_gap_count: number;
  non_blocker_gap_count: number;
  approvals: Array<{
    task_name: string;
    approval_type: NonNullable<ApprovalType>;
    is_critical: boolean;
  }>;
  steps: InventoryStep[];
}

export interface InventoryStep {
  id: string;
  name: string;
  type: string;
  description: string;
  connector_brand: string | null;
  brand_raw: string | null;
  command: string | null;
  script_name: string | null;
  nested_playbook: string | null;
  skipunavailable: boolean;
  is_optional: boolean;
  is_critical: boolean;
  is_blocker: boolean;
  gap_bucket: GapBucket;
  approval_type: ApprovalType;
  next: string[];
}

export interface GapEvent {
  '@timestamp': string;
  event: { kind: string; dataset: string };
  xsoar: {
    pack: string;
    playbook: string;
    playbook_id: string;
    task: string;
    task_id: string;
    gap: {
      bucket: NonNullable<GapBucket>;
      is_critical: boolean;
      is_optional: boolean;
      is_blocker: boolean;
    };
    trigger: InboundTrigger;
    approval_type: ApprovalType;
    command: string | null;
    script_name: string | null;
  };
  connector: { brand: string | null; brand_raw: string | null };
  elastic: { match: ElasticMatch | null; connector_id: string | null };
}

export interface ConnectorFrequencyRow {
  connector_brand: string;
  tasks: number;
  distinct_playbooks: number;
  distinct_packs: number;
  critical_tasks: number;
  optional_tasks: number;
  blocker_tasks: number;
  elastic_match: ElasticMatch;
  elastic_connector_id: string | null;
}
