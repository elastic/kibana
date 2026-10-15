/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import { WATCH_AUTONOMY_LEVELS } from '@kbn/alertzero-common';
import type {
  AdWorkerAnalysisVerdict,
  AdWorkerHandoffOutcome,
  AdWorkerRunOutcome,
  AlertTriageClosureOutcome,
  DetectionRuleSource,
  DetectionRuleType,
  EndpointAnalysisOutcome,
  HuntReportHuntStatus,
  HuntReportMintSuppression,
  HuntReportPackageStatus,
  InvestigationCloseReason,
  RuleCoverageProposalKind,
  RuleCoverageVerdict,
  RuleTuningChangeType,
  RuleTuningEntryGate,
  WorkerDegradedReason,
  WorkerRecommendationConfidence,
  WorkerReviewDecision,
  WorkerRunOutcome,
} from '../../common/telemetry/constants';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  DETECTION_RULE_SOURCES,
  DETECTION_RULE_TYPES,
  ENDPOINT_ANALYSIS_OUTCOMES,
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  INVESTIGATION_CLOSE_REASONS,
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_TUNING_CHANGE_TYPES,
  RULE_TUNING_ENTRY_GATES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../../common/telemetry/constants';
import type {
  AlertZeroAutonomyLevel,
  AlertZeroAutonomyMode,
  AlertZeroScheduleIntervalBucket,
  AlertZeroTriggerType,
  AlertZeroWatchTag,
  AlertZeroWorkerEnabledValue,
  AlertZeroWorkerId,
  AlertZeroWorkerSetting,
} from './constants';
import {
  ALERTZERO_TELEMETRY_EVENTS,
  SCHEDULE_INTERVAL_BUCKETS,
  WORKER_ENABLED_VALUES,
  WORKER_SETTINGS,
} from './constants';
import { formatVocabulary } from './format_vocabulary';
import { SNAPSHOT_FLAGS } from './snapshot/constants';

/** The fields every AlertZero Worker run event carries, built by `buildAlertZeroEnvelope`. */
export interface AlertZeroEnvelope {
  autonomy_level?: AlertZeroAutonomyLevel;
  autonomy_mode?: AlertZeroAutonomyMode;
  execution_id: string;
  is_default_space: boolean;
  run_id: string;
  trigger_type: AlertZeroTriggerType;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

export interface AlertZeroAdWorkerRunCompletedPayload extends AlertZeroEnvelope {
  alerts_analyzed: number;
  attacks_generated: number;
  attacks_persisted: number;
  batches_failed: number;
  batches_total: number;
  run_outcome: AdWorkerRunOutcome;
}

export interface AlertZeroAdWorkerReviewStartedPayload extends AlertZeroEnvelope {
  investigation_id?: string;
  is_rereview?: boolean;
}

export interface AlertZeroAdWorkerAnalysisCompletedPayload extends AlertZeroEnvelope {
  analysis_error: boolean;
  verdict: AdWorkerAnalysisVerdict;
}

export interface AlertZeroAdWorkerHandoffResolvedPayload extends AlertZeroEnvelope {
  auto_approve_requested?: boolean;
  outcome: AdWorkerHandoffOutcome;
  verdict?: AdWorkerAnalysisVerdict;
}

export interface AlertZeroWorkerInvestigationClosedPayload extends AlertZeroEnvelope {
  close_reason: InvestigationCloseReason;
  investigation_id: string;
}

export interface AlertZeroWorkerRunCompletedPayload extends AlertZeroEnvelope {
  candidates_found: number;
  degraded: boolean;
  degraded_reason: WorkerDegradedReason;
  items_dispatched: number;
  items_failed: number;
  items_in_flight: number;
  lookup_failed: boolean;
  run_outcome: WorkerRunOutcome;
  source_read_failed: boolean;
}

export interface AlertZeroAlertTriageBatchClassifiedPayload extends AlertZeroEnvelope {
  alerts_total: number;
  alerts_without_verdict: number;
  fp_below_floor: number;
  fp_candidates: number;
  investigation_id?: string;
  verdicts_false_positive: number;
  verdicts_inconclusive: number;
  verdicts_true_positive: number;
}

export interface AlertZeroAlertTriageClosureResolvedPayload extends AlertZeroEnvelope {
  alerts_proposed: number;
  alerts_retag_failed: number;
  auto_approve_requested: boolean;
  investigation_id?: string;
  outcome: AlertTriageClosureOutcome;
  proposal_read_failed: boolean;
}

export interface AlertZeroRuleTuningReviewCompletedPayload extends AlertZeroEnvelope {
  applied: boolean;
  backtest_ran: boolean;
  backtest_reduced_alerts: boolean;
  change_type: RuleTuningChangeType;
  confidence: WorkerRecommendationConfidence;
  decision: WorkerReviewDecision;
  entry_gate: RuleTuningEntryGate;
  investigation_id?: string;
  rule_source?: DetectionRuleSource;
  rule_type?: DetectionRuleType;
  rule_unavailable: boolean;
}

export interface AlertZeroRuleCoverageReviewCompletedPayload extends AlertZeroEnvelope {
  applied: boolean;
  approved_not_applied: boolean;
  check_failed: boolean;
  creation_failed: boolean;
  creation_skipped: boolean;
  decision: WorkerReviewDecision;
  investigation_id?: string;
  ki_processed: boolean;
  proposal_kind: RuleCoverageProposalKind;
  rule_created: boolean;
  rule_source?: DetectionRuleSource;
  rule_type?: DetectionRuleType;
  verdict: RuleCoverageVerdict;
}

export interface AlertZeroHuntReportCompletedPayload extends AlertZeroEnvelope {
  closed_clean: boolean;
  coverage_kis_skipped: number;
  coverage_kis_written: number;
  has_confirmed_hit: boolean;
  hunt_status: HuntReportHuntStatus;
  investigation_id?: string;
  mint_suppression: HuntReportMintSuppression;
  package_status: HuntReportPackageStatus;
  proposals_dispatch_failed: number;
  proposals_prepared: number;
  tier2_invoked?: boolean;
}

export interface AlertZeroEndpointAnalysisCompletedPayload extends AlertZeroEnvelope {
  actions_recommended: number;
  agent_failed: boolean;
  analysis_outcome: EndpointAnalysisOutcome;
  auto_approve_requested: boolean;
  findings_attached: boolean;
  host_resolved: boolean;
  iocs_found: boolean;
  proposals_dispatch_failed: number;
  proposals_dispatched: number;
  reused_prior_assessment: boolean;
  timeline_found: boolean;
}

export interface AlertZeroWorkerSettingsChangedPayload {
  bulk_write: boolean;
  is_default_space: boolean;
  next_value?:
    | AlertZeroAutonomyLevel
    | AlertZeroScheduleIntervalBucket
    | AlertZeroWorkerEnabledValue;
  previous_value?:
    | AlertZeroAutonomyLevel
    | AlertZeroScheduleIntervalBucket
    | AlertZeroWorkerEnabledValue;
  setting: AlertZeroWorkerSetting;
  settings_revision?: number;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

export interface AlertZeroWorkerActivatedPayload {
  autonomy_level?: AlertZeroAutonomyLevel;
  enabled: boolean;
  is_default_space: boolean;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

export interface AlertZeroAutonomySnapshotWorker {
  autonomy_level: AlertZeroAutonomyLevel;
  count: number;
  enabled: boolean;
  worker_id: AlertZeroWorkerId;
}

export interface AlertZeroAutonomySnapshotPayload {
  service_accounts_enabled: boolean;
  snapshot_day: string;
  space_count: number;
  /** Absent when service accounts are off: the snapshot reads no Worker documents then. */
  workers?: AlertZeroAutonomySnapshotWorker[];
}

export interface AlertZeroFeatureFlagsSnapshotFlag {
  enabled_space_count: number;
  flag: string;
}

export interface AlertZeroFeatureFlagsSnapshotPayload {
  flags: AlertZeroFeatureFlagsSnapshotFlag[];
  service_accounts_enabled: boolean;
  snapshot_day: string;
  space_count: number;
}

/** The payload each AlertZero event type carries. */
export interface AlertZeroTelemetryEventPayloads {
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted]: AlertZeroAdWorkerRunCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted]: AlertZeroAdWorkerReviewStartedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted]: AlertZeroAdWorkerAnalysisCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved]: AlertZeroAdWorkerHandoffResolvedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed]: AlertZeroWorkerInvestigationClosedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted]: AlertZeroWorkerRunCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified]: AlertZeroAlertTriageBatchClassifiedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved]: AlertZeroAlertTriageClosureResolvedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted]: AlertZeroRuleTuningReviewCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted]: AlertZeroRuleCoverageReviewCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted]: AlertZeroHuntReportCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted]: AlertZeroEndpointAnalysisCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerSettingsChanged]: AlertZeroWorkerSettingsChangedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerActivated]: AlertZeroWorkerActivatedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot]: AlertZeroAutonomySnapshotPayload;
  [ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot]: AlertZeroFeatureFlagsSnapshotPayload;
}

const WORKER_ID_DESCRIPTION =
  'Worker catalog id of the managed workflow (for example `system-security-floor-attack-discovery`), or `other` outside the catalog';
const WATCH_TAG_DESCRIPTION =
  'Watch tier tag of the Worker (`watch-floor`, `watch-officer`, `watch-hunt`, `watch-detection` or `watch-forensics`), or `other` outside the catalog';
const AUTONOMY_LEVEL_DESCRIPTION = `Worker autonomy level (${formatVocabulary(
  WATCH_AUTONOMY_LEVELS
)})`;
const IS_DEFAULT_SPACE_DESCRIPTION =
  'Whether the event happened in the default space. The space id itself is never sent';
const INVESTIGATION_ID_DESCRIPTION =
  "It is the Investigation's Agent Builder conversation id, a UUID, and the same value already ships raw as Agent Builder `conversation_id`. Most Workers' Investigations get a random id. Two are derived from a customer record, so they are stable ids for that record, not for a person: an Attack Discovery Worker Investigation's id is the first 120 bits of the attack's `kibana.alert.uuid` (the review's `attack_discovery_id`, a SHA-256 hex) with the UUID version and variant characters set to `8`, and a Hunt Worker Investigation's id is a UUID v5 of the threat report id";
const SNAPSHOT_DAY_DESCRIPTION =
  'UTC day (`YYYY-MM-DD`) the snapshot describes; one snapshot per type per day, used to dedupe catch-up runs';
const SNAPSHOT_SPACE_COUNT_DESCRIPTION = 'Number of spaces the cluster-level aggregate covers';
const SERVICE_ACCOUNTS_ENABLED_DESCRIPTION =
  'Whether Kibana service accounts are on (`xpack.security.serviceAccounts.enabled`). AlertZero installs and manages Workers only when they are';

const ENVELOPE_SCHEMA: RootSchema<AlertZeroEnvelope> = {
  autonomy_level: {
    type: 'keyword',
    _meta: {
      description: `${AUTONOMY_LEVEL_DESCRIPTION}, read from the root execution's persisted definition consts; absent when the root carries none, or when the run does not act at that level (the Endpoint Analysis Worker uses it only for a scheduled run)`,
      optional: true,
    },
  },
  autonomy_mode: {
    type: 'keyword',
    _meta: {
      description:
        'Derived from autonomy_level: `auto_accept` when the Worker gate auto-approves (`supervised`), otherwise `gated`; absent with autonomy_level',
      optional: true,
    },
  },
  execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Generated UUID of the workflow execution that reported the event (the root or one of its descendants)',
      optional: false,
    },
  },
  is_default_space: {
    type: 'boolean',
    _meta: { description: IS_DEFAULT_SPACE_DESCRIPTION, optional: false },
  },
  run_id: {
    type: 'keyword',
    _meta: {
      description:
        "Generated UUID of the Worker run's root execution, derived server-side; every event of one run shares it and it joins to the engine's execution events",
      optional: false,
    },
  },
  trigger_type: {
    type: 'keyword',
    _meta: {
      description:
        "How the root execution started, from its persisted `triggeredBy`: `manual`, `scheduled`, `alert`, `workflow_step`, `event`, `other` (a custom provenance value) or `unknown`. `workflow_step` is the Workflows engine's `triggerType` value `workflow-step`, spelled with an underscore; `manual`, `scheduled`, `alert` and `event` match the engine's values",
      optional: false,
    },
  },
  watch_tag: {
    type: 'keyword',
    _meta: { description: WATCH_TAG_DESCRIPTION, optional: false },
  },
  worker_id: {
    type: 'keyword',
    _meta: { description: WORKER_ID_DESCRIPTION, optional: false },
  },
};

export const ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT: EventTypeOpts<AlertZeroAdWorkerRunCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_analyzed: {
        type: 'long',
        _meta: { description: 'Number of alerts sent to generation', optional: false },
      },
      attacks_generated: {
        type: 'long',
        _meta: {
          description: 'Number of attacks the model generated, before deduplication',
          optional: false,
        },
      },
      attacks_persisted: {
        type: 'long',
        _meta: {
          description: 'Number of attacks persisted and dispatched for review',
          optional: false,
        },
      },
      batches_failed: {
        type: 'long',
        _meta: { description: 'Number of generation batches that failed', optional: false },
      },
      batches_total: {
        type: 'long',
        _meta: { description: 'Number of generation batches attempted', optional: false },
      },
      run_outcome: {
        type: 'keyword',
        _meta: {
          description: `How the run ended: ${formatVocabulary(AD_WORKER_RUN_OUTCOMES)}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_REVIEW_STARTED_EVENT: EventTypeOpts<AlertZeroAdWorkerReviewStartedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted,
    schema: {
      ...ENVELOPE_SCHEMA,
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the review opened or reused; joins Investigation events to the run. ${INVESTIGATION_ID_DESCRIPTION}`,
          optional: true,
        },
      },
      is_rereview: {
        type: 'boolean',
        _meta: {
          description: 'Whether the attack already had an Investigation (a re-review)',
          optional: true,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_ANALYSIS_COMPLETED_EVENT: EventTypeOpts<AlertZeroAdWorkerAnalysisCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      analysis_error: {
        type: 'boolean',
        _meta: {
          description: 'Whether the FP/TP analysis failed or timed out',
          optional: false,
        },
      },
      verdict: {
        type: 'keyword',
        _meta: {
          description: `FP/TP analysis verdict: ${formatVocabulary(AD_WORKER_ANALYSIS_VERDICTS)}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_AD_WORKER_HANDOFF_RESOLVED_EVENT: EventTypeOpts<AlertZeroAdWorkerHandoffResolvedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved,
    schema: {
      ...ENVELOPE_SCHEMA,
      auto_approve_requested: {
        type: 'boolean',
        _meta: {
          description: 'Whether the review asked the escalation gate to auto-approve',
          optional: true,
        },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description: `How the completed escalation gate resolved the forensics handoff: ${formatVocabulary(
            AD_WORKER_HANDOFF_OUTCOMES
          )}`,
          optional: false,
        },
      },
      verdict: {
        type: 'keyword',
        _meta: {
          description:
            'FP/TP analysis verdict that led to the escalation (`true_positive` or `inconclusive`)',
          optional: true,
        },
      },
    },
  };

export const ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT: EventTypeOpts<AlertZeroWorkerInvestigationClosedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed,
    schema: {
      ...ENVELOPE_SCHEMA,
      close_reason: {
        type: 'keyword',
        _meta: {
          description: `Investigation template close reason the Worker wrote, or the class its close maps to: ${formatVocabulary(
            INVESTIGATION_CLOSE_REASONS
          )}`,
          optional: false,
        },
      },
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the Worker closed. The envelope's \`worker_id\` says which Worker. ${INVESTIGATION_ID_DESCRIPTION}`,
          optional: false,
        },
      },
    },
  };

/** A required count field. */
const countField = (description: string) =>
  ({ type: 'long', _meta: { description, optional: false } } as const);

/** A required boolean field. */
const flagField = (description: string) =>
  ({ type: 'boolean', _meta: { description, optional: false } } as const);

/** A required keyword field holding one value of a closed vocabulary, which it lists. */
const vocabularyField = (description: string, values: readonly string[]) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}: ${formatVocabulary(values)}`, optional: false },
  } as const);

/** An optional keyword field holding one value of a closed vocabulary, which it lists. */
const optionalVocabularyField = (description: string, values: readonly string[]) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}: ${formatVocabulary(values)}`, optional: true },
  } as const);

/** The optional Investigation id a Worker item event carries. */
const optionalInvestigationIdField = (description: string) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}. ${INVESTIGATION_ID_DESCRIPTION}`, optional: true },
  } as const);

export const ALERTZERO_WORKER_RUN_COMPLETED_EVENT: EventTypeOpts<AlertZeroWorkerRunCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      candidates_found: countField(
        "Work items the run found to work on, in the Worker's own unit (alerts, rules, indicators or reports)"
      ),
      degraded: flagField(
        'Whether the run did less than the work it found: some items failed, a lookup failed and the run carried on without it, or a limit held work back'
      ),
      degraded_reason: vocabularyField(
        'Main reason the run did less than the work it found, `none` when it did not',
        WORKER_DEGRADED_REASONS
      ),
      items_dispatched: countField('Work items the run started or handed on'),
      items_failed: countField('Work items that failed or could not be started'),
      items_in_flight: countField(
        'Work items still in progress when the run reported that it did not wait for (reviews or analyses it handed off, or that earlier runs started)'
      ),
      lookup_failed: flagField(
        'Whether a secondary lookup (for example the list of reviews already in progress) failed and the run carried on without it'
      ),
      run_outcome: vocabularyField('How the run ended', WORKER_RUN_OUTCOMES),
      source_read_failed: flagField(
        'Whether reading the source of work items failed; zero candidates then does not mean there was no work'
      ),
    },
  };

export const ALERTZERO_ALERT_TRIAGE_BATCH_CLASSIFIED_EVENT: EventTypeOpts<AlertZeroAlertTriageBatchClassifiedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_total: countField('Alerts in the triaged batch'),
      alerts_without_verdict: countField(
        'Alerts the analysis returned no verdict for; they are not tagged, noted or proposed'
      ),
      fp_below_floor: countField(
        'False positives below the confidence floor, which are tagged and noted but not proposed for closure'
      ),
      fp_candidates: countField(
        'False positives at or above the confidence floor, which the closure proposal covers'
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the Worker opened for the batch; joins to its close'
      ),
      verdicts_false_positive: countField('Alerts classified as false positives'),
      verdicts_inconclusive: countField('Alerts classified as inconclusive'),
      verdicts_true_positive: countField('Alerts classified as true positives'),
    },
  };

export const ALERTZERO_ALERT_TRIAGE_CLOSURE_RESOLVED_EVENT: EventTypeOpts<AlertZeroAlertTriageClosureResolvedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_proposed: countField('Alerts the closure proposal covered'),
      alerts_retag_failed: countField(
        'Alerts a dismissal could not re-tag from `az:false_positive`, 0 on any other outcome'
      ),
      auto_approve_requested: flagField(
        'Whether the review asked the gate to auto-approve (supervised autonomy)'
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation of the batch the review settles; joins to the batch and its close'
      ),
      outcome: vocabularyField(
        'How the closure proposal settled (`unknown` is any other gate state)',
        ALERT_TRIAGE_CLOSURE_OUTCOMES
      ),
      proposal_read_failed: flagField(
        'Whether the decided proposal could not be read back, which leaves a dismissal untouched'
      ),
    },
  };

export const ALERTZERO_RULE_TUNING_REVIEW_COMPLETED_EVENT: EventTypeOpts<AlertZeroRuleTuningReviewCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      applied: flagField('Whether an approved tuning change was applied to the rule'),
      backtest_ran: flagField(
        'Whether both backtest previews (current and proposed rule) succeeded'
      ),
      backtest_reduced_alerts: flagField(
        'Whether the proposed rule produced fewer preview alerts than the current rule; false when the backtest did not run'
      ),
      change_type: vocabularyField(
        'Kind of tuning change proposed (`manual` also covers any type the action arms do not name, `none` when nothing was proposed)',
        RULE_TUNING_CHANGE_TYPES
      ),
      confidence: vocabularyField(
        "The diagnosis's stated confidence",
        WORKER_RECOMMENDATION_CONFIDENCES
      ),
      decision: vocabularyField('What the tuning proposal came to', WORKER_REVIEW_DECISIONS),
      entry_gate: vocabularyField(
        'How the manual-autonomy entry gate went (`skipped` when none ran: assisted autonomy, or a rule that could not be read)',
        RULE_TUNING_ENTRY_GATES
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close'
      ),
      rule_source: optionalVocabularyField(
        'Whether the reviewed rule is an Elastic prebuilt rule or a custom one; absent when the rule could not be read',
        DETECTION_RULE_SOURCES
      ),
      rule_type: optionalVocabularyField(
        "The reviewed rule's type (`ml` is machine learning, `query` includes saved query); absent when the rule could not be read",
        DETECTION_RULE_TYPES
      ),
      rule_unavailable: flagField(
        'Whether the rule could not be read or was disabled, so the review did nothing'
      ),
    },
  };

export const ALERTZERO_RULE_COVERAGE_REVIEW_COMPLETED_EVENT: EventTypeOpts<AlertZeroRuleCoverageReviewCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      applied: flagField(
        'Whether an approved enable or install landed, confirmed by re-reading the rule'
      ),
      approved_not_applied: flagField(
        'Whether an approved enable or install did not land; the indicator then stays pending'
      ),
      check_failed: flagField(
        'Whether the indicator was not found or the coverage check returned no verdict'
      ),
      creation_failed: flagField('Whether the rule-creation run failed'),
      creation_skipped: flagField(
        'Whether the rule-creation run completed without proposing a rule'
      ),
      decision: vocabularyField('What the coverage proposal came to', WORKER_REVIEW_DECISIONS),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close'
      ),
      ki_processed: flagField('Whether the knowledge indicator was marked processed'),
      proposal_kind: vocabularyField('What the review proposed', RULE_COVERAGE_PROPOSAL_KINDS),
      rule_created: flagField('Whether a new rule was created for the gap'),
      rule_source: optionalVocabularyField(
        'Whether the rule the review is about (the one it proposed to enable, install, confirm or create) is prebuilt or custom; absent when there is none',
        DETECTION_RULE_SOURCES
      ),
      rule_type: optionalVocabularyField(
        'The type of the rule the review is about (`ml` is machine learning, `query` includes saved query); absent when there is none or the type is unknown',
        DETECTION_RULE_TYPES
      ),
      verdict: vocabularyField("The coverage check's verdict", RULE_COVERAGE_VERDICTS),
    },
  };

export const ALERTZERO_HUNT_REPORT_COMPLETED_EVENT: EventTypeOpts<AlertZeroHuntReportCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      closed_clean: flagField(
        'Whether a clean run (no confirmed hit) closed the Investigation as benign'
      ),
      coverage_kis_skipped: countField('Coverage knowledge items packaging did not write'),
      coverage_kis_written: countField(
        'Coverage knowledge items packaging wrote for Detection Watch'
      ),
      has_confirmed_hit: flagField('Whether the hunt cleared the confirmed-hit bar'),
      hunt_status: vocabularyField(
        "The hunt child's result status (`unknown` is any other value)",
        HUNT_REPORT_HUNT_STATUSES
      ),
      investigation_id: optionalInvestigationIdField(
        "The report's Investigation; joins to its close and reopen"
      ),
      mint_suppression: vocabularyField(
        'Why packaging held back its Proposals',
        HUNT_REPORT_MINT_SUPPRESSIONS
      ),
      package_status: vocabularyField("Packaging's own status", HUNT_REPORT_PACKAGE_STATUSES),
      proposals_dispatch_failed: countField('Proposal gates that failed to launch'),
      proposals_prepared: countField('Proposals packaging prepared and launched a gate for'),
      tier2_invoked: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the hunt ran Tier 2 (behavioral queries); absent when the Worker did not pass it',
          optional: true,
        },
      },
    },
  };

export const ALERTZERO_ENDPOINT_ANALYSIS_COMPLETED_EVENT: EventTypeOpts<AlertZeroEndpointAnalysisCompletedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      actions_recommended: countField('Containment actions the analysis recommended'),
      agent_failed: flagField('Whether the forensic agent failed'),
      analysis_outcome: vocabularyField(
        'How the run settled its indicator',
        ENDPOINT_ANALYSIS_OUTCOMES
      ),
      auto_approve_requested: flagField(
        'Whether containment proposals ask the gate to auto-approve (supervised autonomy)'
      ),
      findings_attached: flagField(
        'Whether both the timeline and the IoC findings are on the Investigation'
      ),
      host_resolved: flagField('Whether a host was found to analyze'),
      iocs_found: flagField('Whether the analysis extracted any indicator of compromise'),
      proposals_dispatch_failed: countField('Containment proposals that did not reach the queue'),
      proposals_dispatched: countField('Containment proposals dispatched to the queue'),
      reused_prior_assessment: flagField(
        "Whether the run found an earlier run's findings already attached and skipped the agent"
      ),
      timeline_found: flagField('Whether the analysis reconstructed any timeline event'),
    },
  };

export const ALERTZERO_WORKER_SETTINGS_CHANGED_EVENT: EventTypeOpts<AlertZeroWorkerSettingsChangedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerSettingsChanged,
    schema: {
      bulk_write: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the same Worker write changed more than one setting, counting an enable or disable as one (one event is sent for each)',
          optional: false,
        },
      },
      is_default_space: {
        type: 'boolean',
        _meta: { description: IS_DEFAULT_SPACE_DESCRIPTION, optional: false },
      },
      next_value: {
        type: 'keyword',
        _meta: {
          description: `New value, only for enum, bounded or boolean settings: the autonomy level (${formatVocabulary(
            WATCH_AUTONOMY_LEVELS
          )}) for \`autonomy\`, the interval bucket (${formatVocabulary(
            SCHEDULE_INTERVAL_BUCKETS
          )}) for \`schedule_interval\`, or ${formatVocabulary(
            WORKER_ENABLED_VALUES
          )} (strings) for \`enabled\`. Absent for \`extras\`, \`service_account\` and \`other\``,
          optional: true,
        },
      },
      previous_value: {
        type: 'keyword',
        _meta: {
          description: `Previous value, with the same rules as next_value (${formatVocabulary(
            WORKER_ENABLED_VALUES
          )} for \`enabled\`); the Worker's defaults on its first save`,
          optional: true,
        },
      },
      setting: {
        type: 'keyword',
        _meta: {
          description: `Which setting changed: ${formatVocabulary(
            WORKER_SETTINGS
          )}, where \`enabled\` is an enable or disable of an installed Worker and \`other\` is any settings key outside the allowlist. \`service_account\` is a change of the Worker's service account, sent without the account. Values are never sent for \`extras\`, \`service_account\` or \`other\`. One event per changed setting`,
          optional: false,
        },
      },
      settings_revision: {
        type: 'long',
        _meta: {
          description:
            "Settings revision the write was accepted against (the Worker document's version before the write); absent on a Worker's first save and on an enable or disable that saves no settings",
          optional: true,
        },
      },
      watch_tag: {
        type: 'keyword',
        _meta: { description: WATCH_TAG_DESCRIPTION, optional: false },
      },
      worker_id: {
        type: 'keyword',
        _meta: { description: WORKER_ID_DESCRIPTION, optional: false },
      },
    },
  };

export const ALERTZERO_WORKER_ACTIVATED_EVENT: EventTypeOpts<AlertZeroWorkerActivatedPayload> = {
  eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerActivated,
  schema: {
    autonomy_level: {
      type: 'keyword',
      _meta: {
        description: `${AUTONOMY_LEVEL_DESCRIPTION} the Worker was installed with`,
        optional: true,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the Worker is enabled after the write that installed it (a settings save or a disable installs it disabled)',
        optional: false,
      },
    },
    is_default_space: {
      type: 'boolean',
      _meta: { description: IS_DEFAULT_SPACE_DESCRIPTION, optional: false },
    },
    watch_tag: {
      type: 'keyword',
      _meta: { description: WATCH_TAG_DESCRIPTION, optional: false },
    },
    worker_id: {
      type: 'keyword',
      _meta: { description: WORKER_ID_DESCRIPTION, optional: false },
    },
  },
};

export const ALERTZERO_AUTONOMY_SNAPSHOT_EVENT: EventTypeOpts<AlertZeroAutonomySnapshotPayload> = {
  eventType: ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot,
  schema: {
    service_accounts_enabled: {
      type: 'boolean',
      _meta: {
        description: `${SERVICE_ACCOUNTS_ENABLED_DESCRIPTION}. When false, the snapshot reads no Worker documents and \`workers\` is absent`,
        optional: false,
      },
    },
    snapshot_day: {
      type: 'keyword',
      _meta: { description: SNAPSHOT_DAY_DESCRIPTION, optional: false },
    },
    space_count: {
      type: 'long',
      _meta: { description: SNAPSHOT_SPACE_COUNT_DESCRIPTION, optional: false },
    },
    workers: {
      type: 'array',
      items: {
        properties: {
          autonomy_level: {
            type: 'keyword',
            _meta: { description: AUTONOMY_LEVEL_DESCRIPTION, optional: false },
          },
          count: {
            type: 'long',
            _meta: {
              description: 'Number of spaces with this Worker at this autonomy level and state',
              optional: false,
            },
          },
          enabled: {
            type: 'boolean',
            _meta: { description: 'Whether the installed Worker is enabled', optional: false },
          },
          worker_id: {
            type: 'keyword',
            _meta: { description: WORKER_ID_DESCRIPTION, optional: false },
          },
        },
        _meta: {
          description: 'One count per worker_id, autonomy_level and enabled combination',
        },
      },
      _meta: {
        description:
          'Installed Worker counts across the cluster, summed over spaces. Absent when service_accounts_enabled is false, because no Worker document was read',
        optional: true,
      },
    },
  },
};

export const ALERTZERO_FEATURE_FLAGS_SNAPSHOT_EVENT: EventTypeOpts<AlertZeroFeatureFlagsSnapshotPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot,
    schema: {
      flags: {
        type: 'array',
        items: {
          properties: {
            enabled_space_count: {
              type: 'long',
              _meta: {
                description: 'Number of spaces where the flag is enabled',
                optional: false,
              },
            },
            flag: {
              type: 'keyword',
              _meta: {
                description: `Allowlisted feature flag or advanced setting id, one of ${formatVocabulary(
                  SNAPSHOT_FLAGS
                )}`,
                optional: false,
              },
            },
          },
          _meta: { description: 'Enabled-space count of one allowlisted flag' },
        },
        _meta: { description: 'Per-flag enabled-space counts across the cluster' },
      },
      service_accounts_enabled: {
        type: 'boolean',
        _meta: { description: SERVICE_ACCOUNTS_ENABLED_DESCRIPTION, optional: false },
      },
      snapshot_day: {
        type: 'keyword',
        _meta: { description: SNAPSHOT_DAY_DESCRIPTION, optional: false },
      },
      space_count: {
        type: 'long',
        _meta: { description: SNAPSHOT_SPACE_COUNT_DESCRIPTION, optional: false },
      },
    },
  };

/** Every AlertZero event type, in registration order. */
export const ALERTZERO_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_REVIEW_STARTED_EVENT,
  ALERTZERO_AD_WORKER_ANALYSIS_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_HANDOFF_RESOLVED_EVENT,
  ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT,
  ALERTZERO_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_ALERT_TRIAGE_BATCH_CLASSIFIED_EVENT,
  ALERTZERO_ALERT_TRIAGE_CLOSURE_RESOLVED_EVENT,
  ALERTZERO_RULE_TUNING_REVIEW_COMPLETED_EVENT,
  ALERTZERO_RULE_COVERAGE_REVIEW_COMPLETED_EVENT,
  ALERTZERO_HUNT_REPORT_COMPLETED_EVENT,
  ALERTZERO_ENDPOINT_ANALYSIS_COMPLETED_EVENT,
  ALERTZERO_WORKER_SETTINGS_CHANGED_EVENT,
  ALERTZERO_WORKER_ACTIVATED_EVENT,
  ALERTZERO_AUTONOMY_SNAPSHOT_EVENT,
  ALERTZERO_FEATURE_FLAGS_SNAPSHOT_EVENT,
] as const;
