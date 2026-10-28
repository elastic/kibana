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
  AdWorkerEscalatedVerdict,
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
  RuleReviewEntryGate,
  RuleTuningChangeType,
  WorkerDegradedReason,
  WorkerRecommendationConfidence,
  WorkerReviewDecision,
  WorkerRunOutcome,
} from '../../common/telemetry/constants';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_ESCALATED_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  ALERT_TRIAGE_GROUPING_STATES,
  type AlertTriageGroupingState,
  DETECTION_RULE_SOURCES,
  DETECTION_RULE_TYPES,
  ENDPOINT_ANALYSIS_OUTCOMES,
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  INVESTIGATION_CLOSE_REASONS,
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_REVIEW_ENTRY_GATES,
  RULE_TUNING_CHANGE_TYPES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../../common/telemetry/constants';
import type {
  AlertZeroAutonomyLevel,
  AlertZeroAutonomyMode,
  AlertZeroTriggerType,
  AlertZeroWatchTag,
  AlertZeroWorkerId,
} from './constants';
import { ALERTZERO_TELEMETRY_EVENTS } from './constants';
import { formatVocabulary } from './format_vocabulary';

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
  investigation_id: string;
  is_rereview: boolean;
}

export interface AlertZeroAdWorkerAnalysisCompletedPayload extends AlertZeroEnvelope {
  analysis_error: boolean;
  verdict: AdWorkerAnalysisVerdict;
}

export interface AlertZeroAdWorkerHandoffResolvedPayload extends AlertZeroEnvelope {
  auto_approve_requested: boolean;
  outcome: AdWorkerHandoffOutcome;
  verdict: AdWorkerEscalatedVerdict;
}

export interface AlertZeroWorkerInvestigationClosedPayload extends AlertZeroEnvelope {
  close_reason: InvestigationCloseReason;
  investigation_id: string;
}

export interface AlertZeroWorkerInvestigationReopenedPayload {
  investigation_id: string;
  is_default_space: boolean;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
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

export interface AlertZeroAlertTriageBatchGroupedPayload extends AlertZeroEnvelope {
  alerts_joined: number;
  alerts_pooled: number;
  alerts_with_strict_key: number;
  conversation_created: boolean;
  fp_candidates_on_fallback: number;
  grouping: AlertTriageGroupingState;
  proposals_created: number;
  strict_keys: number;
  strict_keys_single_alert: number;
  wide_keys: number;
  wide_keys_single_alert: number;
}

export interface AlertZeroAlertTriageClosureResolvedPayload extends AlertZeroEnvelope {
  alerts_proposed: number;
  alerts_retag_failed: number;
  revisions: number;
  auto_approve_requested: boolean;
  investigation_id: string;
  outcome: AlertTriageClosureOutcome;
  proposal_read_failed: boolean;
}

export interface AlertZeroRuleTuningReviewCompletedPayload extends AlertZeroEnvelope {
  applied: boolean;
  approved_not_applied: boolean;
  backtest_ran: boolean;
  backtest_reduced_alerts: boolean;
  change_type: RuleTuningChangeType;
  confidence: WorkerRecommendationConfidence;
  decision: WorkerReviewDecision;
  entry_gate: RuleReviewEntryGate;
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
  entry_gate: RuleReviewEntryGate;
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

/** The payload each AlertZero event type carries. */
export interface AlertZeroTelemetryEventPayloads {
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted]: AlertZeroAdWorkerRunCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted]: AlertZeroAdWorkerReviewStartedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted]: AlertZeroAdWorkerAnalysisCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved]: AlertZeroAdWorkerHandoffResolvedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed]: AlertZeroWorkerInvestigationClosedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened]: AlertZeroWorkerInvestigationReopenedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted]: AlertZeroWorkerRunCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified]: AlertZeroAlertTriageBatchClassifiedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped]: AlertZeroAlertTriageBatchGroupedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved]: AlertZeroAlertTriageClosureResolvedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted]: AlertZeroRuleTuningReviewCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted]: AlertZeroRuleCoverageReviewCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted]: AlertZeroHuntReportCompletedPayload;
  [ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted]: AlertZeroEndpointAnalysisCompletedPayload;
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
          optional: false,
        },
      },
      is_rereview: {
        type: 'boolean',
        _meta: {
          description: 'Whether the attack already had an Investigation (a re-review)',
          optional: false,
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
          optional: false,
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
          description: `FP/TP analysis verdict that led to the escalation: ${formatVocabulary(
            AD_WORKER_ESCALATED_VERDICTS
          )}`,
          optional: false,
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

export const ALERTZERO_WORKER_INVESTIGATION_REOPENED_EVENT: EventTypeOpts<AlertZeroWorkerInvestigationReopenedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened,
    schema: {
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: `The Investigation the Worker reopened, so a new run records into active work. ${INVESTIGATION_ID_DESCRIPTION}`,
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
        _meta: {
          description: `${WORKER_ID_DESCRIPTION}. Only the Hunt Worker reopens its own Investigations today`,
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

/** The Investigation id a Worker item event always carries. */
const investigationIdField = (description: string) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}. ${INVESTIGATION_ID_DESCRIPTION}`, optional: false },
  } as const);

/** The Investigation id a Worker item event carries except in the one case its description names. */
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
        'Whether the run did less than the work it found: true when it reported a `degraded_reason` other than `none`, some items failed, a lookup failed and the run carried on without it, or reading its source failed'
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
        'The Investigation of the batch, absent because a batch has none: only a new proposal or a failure creates one'
      ),
      verdicts_false_positive: countField('Alerts classified as false positives'),
      verdicts_inconclusive: countField('Alerts classified as inconclusive'),
      verdicts_true_positive: countField('Alerts classified as true positives'),
    },
  };

export const ALERTZERO_ALERT_TRIAGE_BATCH_GROUPED_EVENT: EventTypeOpts<AlertZeroAlertTriageBatchGroupedPayload> =
  {
    eventType: ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_joined: countField(
        'Alerts that joined a proposal an earlier batch had opened; 0 when grouping is off'
      ),
      alerts_pooled: countField(
        'Alerts whose key had no other alert in the batch and no open proposal, so they went into one shared proposal; 0 when grouping is off'
      ),
      alerts_with_strict_key: countField(
        'Classified alerts with a strict pattern key, whatever their verdict'
      ),
      conversation_created: flagField(
        'Whether the batch created a conversation: one for each new proposal, and one for a failure that does not end the run (no verdicts, or some alerts without one). A batch that only joins proposals, or has no false positive to propose, creates none'
      ),
      fp_candidates_on_fallback: countField(
        'False positives at or above the confidence floor that have no strict key, so they group by rule and detection only'
      ),
      grouping: vocabularyField(
        'Whether the batch was grouped, or why not: supervised autonomy, the kill switch, a proposal lookup that returned fewer proposals than it matched, or nothing to propose',
        ALERT_TRIAGE_GROUPING_STATES
      ),
      proposals_created: countField(
        'New closure proposals the batch raised; 0 when grouping is off'
      ),
      strict_keys: countField('Distinct strict pattern keys among the classified alerts'),
      strict_keys_single_alert: countField(
        'Strict pattern keys that only one alert of the batch has'
      ),
      wide_keys: countField('Distinct wide pattern keys among the classified alerts'),
      wide_keys_single_alert: countField('Wide pattern keys that only one alert of the batch has'),
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
      revisions: countField(
        'Revisions the proposal reached when it settled, counting the first as 1; more than 1 means alerts joined it'
      ),
      auto_approve_requested: flagField(
        'Whether the review asked the gate to auto-approve (supervised autonomy)'
      ),
      investigation_id: investigationIdField(
        'The Investigation of the proposal the review settles; joins to its close'
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
      applied: flagField(
        'Whether an approved tuning change landed, confirmed by re-reading the rule (a changed revision, or the exception item the change added)'
      ),
      approved_not_applied: flagField(
        'Whether an approved tuning change with an action succeeded but could not be confirmed on the rule (the re-read failed or showed no new revision). The review still tags the alerts and closes the Investigation, so no later sweep retries it'
      ),
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
        RULE_REVIEW_ENTRY_GATES
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close. Absent only when `rule_unavailable` is true, because the review opens none for a rule it cannot read or that is disabled'
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
      entry_gate: vocabularyField(
        'How the manual-autonomy entry gate went (`skipped` when none ran: assisted autonomy, or no Investigation was opened). A declined or unanswered gate ends the review, so its event has `decision: none`',
        RULE_REVIEW_ENTRY_GATES
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close. Absent only when `check_failed` is true, because the review opens none when the indicator is not found'
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
        "The report's Investigation; joins to its close and reopen. Absent only when `package_status` is `run_incomplete`, because the Worker could not find or create the Investigation"
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

/** Every AlertZero event type, in registration order. */
export const ALERTZERO_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_REVIEW_STARTED_EVENT,
  ALERTZERO_AD_WORKER_ANALYSIS_COMPLETED_EVENT,
  ALERTZERO_AD_WORKER_HANDOFF_RESOLVED_EVENT,
  ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT,
  ALERTZERO_WORKER_INVESTIGATION_REOPENED_EVENT,
  ALERTZERO_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_ALERT_TRIAGE_BATCH_CLASSIFIED_EVENT,
  ALERTZERO_ALERT_TRIAGE_BATCH_GROUPED_EVENT,
  ALERTZERO_ALERT_TRIAGE_CLOSURE_RESOLVED_EVENT,
  ALERTZERO_RULE_TUNING_REVIEW_COMPLETED_EVENT,
  ALERTZERO_RULE_COVERAGE_REVIEW_COMPLETED_EVENT,
  ALERTZERO_HUNT_REPORT_COMPLETED_EVENT,
  ALERTZERO_ENDPOINT_ANALYSIS_COMPLETED_EVENT,
] as const;
