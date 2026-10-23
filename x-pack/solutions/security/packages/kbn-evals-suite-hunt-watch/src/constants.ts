/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Worker's managed workflow id. Installed per-space (templated as
 * `{WORKER_WORKFLOW_ID}-{spaceId}`) once the Worker is enabled in that space — it does not
 * exist globally the way the four hunt children below do. The eval asserts the installed
 * per-space document; it does not create or carry its own copy, so eval and production
 * cannot drift.
 */
export { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID as HUNT_WORKER_WORKFLOW_ID } from '@kbn/workflows/managed';

/**
 * The four hunt child workflows the Worker's `report_fan_out` branch invokes via
 * `workflow.execute`. Installed globally at plugin start (installStatic /
 * ALERTZERO_WATCH_WORKFLOW_IDS), unlike the per-space Worker above.
 */
export {
  ALERTZERO_HUNT_WORKFLOW_ID as HUNT_EXECUTE_WORKFLOW_ID,
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID as HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID as HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID as HUNT_PROPOSAL_GATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * Public API version shared by `/api/workflows/*`, `/api/agent_builder/*` and `/api/spaces/*`.
 * Inlined: the workflows source of truth lives in the plugin, not a package.
 */
export const PUBLIC_API_VERSION = '2023-10-31';

/**
 * Step ids from the managed Worker yaml
 * (`kbn-workflows/managed/definitions/alertzero/hunt/hunt_continuous_threat_hunt.yaml`) that the
 * client and evaluators address directly. A rename here must be mirrored below or installed
 * workflow checks fail loudly instead of surfacing as opaque poll timeouts downstream.
 */
export const CHECK_INDEX_SCOPE_STEP_ID = 'check_index_scope';
export const RESOLVE_INDEX_SCOPE_GATE_STEP_ID = 'resolve_index_scope_gate';
export const SELECT_CANDIDATE_REPORTS_STEP_ID = 'select_candidate_reports';
export const FIND_OR_CREATE_INVESTIGATION_STEP_ID = 'find_or_create_investigation';
export const HUNT_STEP_ID = 'hunt';
export const PACKAGE_REPORT_STEP_ID = 'package_report';
export const WRITE_RUN_CONCLUSION_STEP_ID = 'write_run_conclusion';
export const RESOLVE_RUN_OUTCOME_STEP_ID = 'resolve_run_outcome';
/**
 * Step inside the `hunt` child workflow that starts the coordinator. Since the coordinator went
 * async its output is only the start envelope (`run_id`, `state`, `result_attachment_id`).
 */
export const RUN_HUNT_COORDINATOR_STEP_ID = 'run_hunt_coordinator';
/**
 * Poll step inside the `hunt` child workflow. Runs once per poll iteration; the iteration whose
 * `output.data.state` is `completed` carries the full coordinator result under `data.result`.
 */
export const READ_HUNT_RESULT_STEP_ID = 'read_hunt_result';

/** Every step id the Worker yaml must still declare for the client/evaluators to work. */
export const REQUIRED_WORKER_STEP_IDS = [
  CHECK_INDEX_SCOPE_STEP_ID,
  RESOLVE_INDEX_SCOPE_GATE_STEP_ID,
  SELECT_CANDIDATE_REPORTS_STEP_ID,
  FIND_OR_CREATE_INVESTIGATION_STEP_ID,
  HUNT_STEP_ID,
  PACKAGE_REPORT_STEP_ID,
  WRITE_RUN_CONCLUSION_STEP_ID,
  RESOLVE_RUN_OUTCOME_STEP_ID,
] as const;

/** Eval space ids. `default` is seeded directly; the other three are created by the preflight. */
export const DEFAULT_EVAL_SPACE_ID = 'default';
export const HUNT_A_SPACE_ID = 'hunt-a';
export const HUNT_B_SPACE_ID = 'hunt-b';
export const HUNT_BLOCKED_SPACE_ID = 'hunt-blocked';

/** All eval spaces the Worker is enabled in by the preflight fixture. */
export const EVAL_SPACE_IDS = [
  DEFAULT_EVAL_SPACE_ID,
  HUNT_A_SPACE_ID,
  HUNT_B_SPACE_ID,
  HUNT_BLOCKED_SPACE_ID,
] as const;

/** Index pattern that resolves to no indices/data streams/aliases, used to induce `blocked`. */
export const HUNT_BLOCKED_INDEX_PATTERN = 'logs-hunt-eval-nonexistent-*';

/**
 * Fixture report ids from the Demo C+ generator (elastic/kibana#291895, on `main`). Id scheme is
 * `ti-report-<reportIdSlug>-historic-NN`; the slugs below mirror `PACK_TI_SCENARIOS['aws-iam']`
 * in `security_solution/scripts/data/lib/threat_intel_fixtures.ts`. That file is not importable
 * from a package, so `seed_contract.test.ts` reads it as text to catch drift.
 */
export const TI_REPORT_AWS_IAM_PREFIX = 'ti-report-aws-iam';
export const TI_REPORT_CANARY_ID = 'ti-report-hunt-eval-canary-01';
export const TI_REPORT_MISSING_ID = 'ti-report-hunt-eval-missing-01';
/** Suite-authored report carrying more IOCs than one hunt accepts; induces `partial`. */
export const TI_REPORT_IOC_DUMP_ID = 'ti-report-hunt-eval-ioc-dump-01';

/**
 * `MAX_HUNT_REPORT_IOCS` in `alertzero/server/services/watches/hunt/common/load_report_context.ts`.
 * Not importable from a package; `seed_contract.test.ts` reads that file as text to catch drift.
 * One more than the bound is enough: the coordinator counts what it dropped, not how much.
 */
export const HUNT_REPORT_IOC_BOUND = 100;
export const IOC_DUMP_IOC_COUNT = HUNT_REPORT_IOC_BOUND + 1;

/** `reportIdSlug` of each aws-iam scenario the generator seeds. */
export const AWS_IAM_REPORT_SLUGS = [
  'aws-iam',
  'aws-iam-assume-role',
  'aws-iam-ioc-only',
  'aws-iam-behavior-only',
  'aws-iam-clean',
] as const;
export type AwsIamReportSlug = (typeof AWS_IAM_REPORT_SLUGS)[number];

/** Historic reports seeded per scenario (`--threat-intel-report-count`). */
export const HISTORIC_REPORTS_PER_SCENARIO = 3;

export const buildHistoricReportId = (slug: AwsIamReportSlug, slot: number): string =>
  `ti-report-${slug}-historic-${String(slot).padStart(2, '0')}`;

/** Id of a report copied into a non-default eval space (`<original-id>-<spaceId>`). */
export const buildSpaceCopyReportId = (reportId: string, spaceId: string): string =>
  `${reportId}-${spaceId}`;

/** Every report id the generator writes for the aws-iam pack (5 scenarios x 3 historic). */
export const GENERATED_AWS_IAM_REPORT_IDS: readonly string[] = AWS_IAM_REPORT_SLUGS.flatMap(
  (slug) =>
    Array.from({ length: HISTORIC_REPORTS_PER_SCENARIO }, (_, i) =>
      buildHistoricReportId(slug, i + 1)
    )
);

/** Report ids the dataset rows bind to. */
export const HUNT_REPORT_IDS = {
  /** Golden `hit`: behavior-only, smoke-proven end to end (Tier 1 clean, Tier 2 AssumeRole hit). */
  hit: buildHistoricReportId('aws-iam-behavior-only', 2),
  /** Golden `clean`: password-spray advisory disjoint from seeded telemetry. */
  clean: buildHistoricReportId('aws-iam-clean', 1),
  /** Hard clean repeat: a second clean report on a different id. */
  cleanRepeat: buildHistoricReportId('aws-iam-clean', 2),
  /** Hard `difficult hit`: IOC-only narrative with no technique ids for Tier 2. */
  difficultHit: buildHistoricReportId('aws-iam-ioc-only', 2),
  /** Hard `multi-candidate`: three named reports in one trigger. */
  multiCandidate: [
    buildHistoricReportId('aws-iam', 1),
    buildHistoricReportId('aws-iam-assume-role', 1),
    buildHistoricReportId('aws-iam-ioc-only', 1),
  ],
  /** Hard `no-candidates`: an id that does not exist. Must complete with `not_found`. */
  missing: TI_REPORT_MISSING_ID,
  /** Hard `partial`: suite-authored IOC dump over the per-hunt bound (`input_truncated`). */
  iocDump: TI_REPORT_IOC_DUMP_ID,
  /**
   * Hard `failed`: a default-space copy of the clean report whose Investigation the suite locks
   * (a private conversation owned by another user) before the run, so `find_or_create` fails.
   */
  lockedInvestigation: `${buildHistoricReportId('aws-iam-clean', 1)}-locked`,
  /** Canary: suite-authored prose-only report with no IOCs or technique ids. */
  canary: TI_REPORT_CANARY_ID,
} as const;

/** Default-space reports copied into non-default eval spaces, keyed by target space. */
export const SPACE_COPY_SOURCES: ReadonlyArray<{
  spaceId: string;
  sourceReportId: string;
  copyReportId: string;
}> = [
  { spaceId: HUNT_BLOCKED_SPACE_ID, sourceSlug: 'aws-iam' as const, slot: 1 },
  { spaceId: HUNT_A_SPACE_ID, sourceSlug: 'aws-iam-behavior-only' as const, slot: 1 },
  { spaceId: HUNT_B_SPACE_ID, sourceSlug: 'aws-iam-behavior-only' as const, slot: 1 },
].map(({ spaceId, sourceSlug, slot }) => {
  const sourceReportId = buildHistoricReportId(sourceSlug, slot);
  return {
    spaceId,
    sourceReportId,
    copyReportId: buildSpaceCopyReportId(sourceReportId, spaceId),
  };
});

const copyIdFor = (spaceId: string): string => {
  const entry = SPACE_COPY_SOURCES.find((c) => c.spaceId === spaceId);
  if (!entry) throw new Error(`No space copy configured for space "${spaceId}"`);
  return entry.copyReportId;
};

/** Report ids the space rows trigger inside their own space. */
export const SPACE_REPORT_IDS = {
  blocked: copyIdFor(HUNT_BLOCKED_SPACE_ID),
  spaceA: copyIdFor(HUNT_A_SPACE_ID),
  spaceB: copyIdFor(HUNT_B_SPACE_ID),
} as const;

/** Threat intel index the seed writes into. Must already exist (Kibana creates it). */
export const THREAT_REPORTS_INDEX = '.kibana-threat-reports';

/** Holdout reports: the `historic-03` slot of scenarios the iteration cohorts never trigger. */
export const HOLDOUT_REPORT_IDS = [
  buildHistoricReportId('aws-iam-assume-role', 3),
  buildHistoricReportId('aws-iam-ioc-only', 3),
  buildHistoricReportId('aws-iam-clean', 3),
] as const;
