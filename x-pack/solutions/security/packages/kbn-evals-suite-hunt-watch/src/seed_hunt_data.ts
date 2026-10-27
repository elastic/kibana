/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import execa from 'execa';
import { v5 as uuidv5 } from 'uuid';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  OPEN_PROPOSAL_STATUSES,
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_DISMISS_URL,
} from '@kbn/proposals-common';
import {
  DEFAULT_EVAL_SPACE_ID,
  GENERATED_AWS_IAM_REPORT_IDS,
  HISTORIC_REPORTS_PER_SCENARIO,
  HUNT_REPORT_IDS,
  IOC_DUMP_IOC_COUNT,
  PUBLIC_API_VERSION,
  SPACE_COPY_SOURCES,
  THREAT_REPORTS_INDEX,
} from './constants';
import type { HuntFault } from './types';
import { apiVersion, errorMessage, httpStatus, isEsNotFound, sleep, spacePath } from './kibana_api';

const GENERATOR_CLI = Path.join(
  'x-pack',
  'solutions',
  'security',
  'plugins',
  'security_solution',
  'scripts',
  'data',
  'generate_cli.js'
);

/** Pack the generator seeds. Telemetry lands in shared `logs-aws.*` streams. */
const GENERATOR_PACK = 'aws-iam';

/**
 * Fleet's `AGENT_STATUS_CHANGE_DATA_STREAM_NAME` (`x-pack/platform/plugins/shared/fleet/common`).
 * Not imported: the suite only needs the name, and the stream is covered by the stock `logs-*-*`
 * template, so creating it needs nothing from Fleet.
 */
export const FLEET_AGENT_STATUS_CHANGE_STREAM = 'logs-elastic_agent.status_change-default';

/**
 * The one Security default pattern that resolves to indices on this stack (the generator pack,
 * the endpoint fixtures, and Fleet's streams all land under it), so it is where a shard can still
 * be initializing when the first hunt searches.
 */
const HUNT_SCOPE_PATTERN = 'logs-*';

const isEsResourceAlreadyExists = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 400 &&
  /resource_already_exists_exception/.test(errorMessage(error));

/**
 * The generator enrolls a Fleet agent for the correlated host, and Fleet's status change task
 * writes its first document for that agent a minute or so later, creating
 * `logs-elastic_agent.status_change-default` on the fly. That stream sits under the Worker's
 * `logs-*` scope, and a Tier 1 search that lands while its primary is still initializing comes
 * back with one failed shard, which the coordinator records as `search_partial` and the run ends
 * `partial` (seen live: the stream and the search shared the same second). Creating the stream
 * before any hunt runs, then waiting for every scoped shard to start, takes that race out of the
 * suite without hiding a real `partial` from the product.
 */
export const settleHuntScope = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await esClient.indices.createDataStream({ name: FLEET_AGENT_STATUS_CHANGE_STREAM });
    log.info(`Created ${FLEET_AGENT_STATUS_CHANGE_STREAM} ahead of Fleet's first status change`);
  } catch (error) {
    if (!isEsResourceAlreadyExists(error)) {
      throw error;
    }
    log.info(`${FLEET_AGENT_STATUS_CHANGE_STREAM} already exists; waiting for its shards`);
  }
  await esClient.cluster.health({
    index: HUNT_SCOPE_PATTERN,
    wait_for_status: 'yellow',
    wait_for_no_initializing_shards: true,
    timeout: '60s',
  });
};

/**
 * Mirrors `HUNT_INVESTIGATION_ID_NAMESPACE` and the frozen namespace uuid in the alertzero
 * plugin (`common/constants.ts`, `hunt_investigation_id.ts`). Neither is exported from a package,
 * so `seed_contract.test.ts` reads those files as text to catch drift.
 */
export const HUNT_INVESTIGATION_ID_NAMESPACE = 'hunt:report:';
export const HUNT_INVESTIGATION_UUID_NAMESPACE = '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50';

export const buildHuntInvestigationConversationId = ({
  spaceId,
  reportId,
}: {
  spaceId: string;
  reportId: string;
}): string =>
  uuidv5(
    `${HUNT_INVESTIGATION_ID_NAMESPACE}${spaceId}|${reportId}`,
    HUNT_INVESTIGATION_UUID_NAMESPACE
  );

export interface GeneratorTarget {
  kibanaUrl: string;
  elasticsearchUrl: string;
  username: string;
  password: string;
}

/**
 * Prose-only report with no IOCs, technique ids, or principals. Written straight into the
 * (already existing) threat reports index with the same shape as a generator historic report.
 * `seed_contract.test.ts` asserts it stays free of IOC and technique tokens.
 */
export const buildCanaryReportDoc = (timestamp: string) => ({
  '@timestamp': timestamp,
  content_fingerprint: `hunt-eval-canary-${HUNT_REPORT_IDS.canary}`,
  space_id: 'default',
  source: {
    type: 'rss',
    name: 'Hunt eval canary feed',
    url: 'https://example.invalid/hunt-eval-canary',
    adapter_id: 'rss:hunt-eval-canary',
  },
  content: {
    title: 'General security awareness reminder',
    body_text:
      'Organizations should stay vigilant and keep security practices up to date. ' +
      'Regular reviews, clear communication, and a culture of caution help teams respond well ' +
      'when something unusual happens. No specific activity is described in this note.',
    language: 'en',
  },
  severity: { level: 'low', score: 10 },
  extracted: {
    categories: [],
    ttps: { techniques: [] },
    iocs: [],
    relevance: 0.1,
  },
  geography: { regions: ['global'] },
  lineage: {
    ingested_at: timestamp,
    extracted_at: timestamp,
    extraction_method: 'seeded',
    source_doc_ref: { index: 'rss:feed', id: HUNT_REPORT_IDS.canary },
  },
});

/**
 * TEST-NET-3 (RFC 5737) addresses, one per IOC. The generator's telemetry and its own decoys use
 * TEST-NET-1 (`192.0.2.0/24`), so none of these can match an environment event, and Tier 1 ends
 * `no_environment_hits` over the prefix it does search.
 */
const iocDumpAddresses = (): string[] =>
  Array.from({ length: IOC_DUMP_IOC_COUNT }, (_, i) => `203.0.113.${i + 1}`);

/**
 * A blocklist-style report with one more searchable IOC than a hunt accepts. The coordinator hunts
 * the first `MAX_HUNT_REPORT_IOCS` and records the rest as an `input_truncated` gap, which is
 * deterministic (`incomplete_final`): the run ends `partial` at the `hunt` stage, evidence is
 * written as incomplete rather than clean, and the report retires. The body names no technique
 * and no principal, so Tier 2 has nothing to derive and the row stays about the IOC bound.
 */
export const buildIocDumpReportDoc = (timestamp: string) => ({
  '@timestamp': timestamp,
  content_fingerprint: `hunt-eval-ioc-dump-${HUNT_REPORT_IDS.iocDump}`,
  space_id: DEFAULT_EVAL_SPACE_ID,
  source: {
    type: 'rss',
    name: 'Hunt eval blocklist feed',
    url: 'https://example.invalid/hunt-eval-blocklist',
    adapter_id: 'rss:hunt-eval-blocklist',
  },
  content: {
    title: `Bulk indicator feed: ${IOC_DUMP_IOC_COUNT} scanning addresses`,
    body_text:
      `This feed lists ${IOC_DUMP_IOC_COUNT} IPv4 addresses observed scanning exposed services ` +
      'over the past week. Defenders should block or monitor traffic from the listed addresses. ' +
      'No specific intrusion activity, tooling, or affected organization is described.',
    language: 'en',
  },
  severity: { level: 'medium', score: 40 },
  extracted: {
    categories: ['scanning'],
    ttps: { techniques: [] },
    iocs: iocDumpAddresses().map((value) => ({
      type: 'ip',
      value,
      defanged: value.replace(/\./g, '[.]'),
    })),
    relevance: 0.4,
  },
  geography: { regions: ['global'] },
  lineage: {
    ingested_at: timestamp,
    extracted_at: timestamp,
    extraction_method: 'seeded',
    source_doc_ref: { index: 'rss:feed', id: HUNT_REPORT_IDS.iocDump },
  },
});

/**
 * Stages a fault for one row, after `resetHuntReport` has cleared the previous run and before the
 * Worker runs. See `HuntFault` for what each one models.
 */
export const applyHuntFault = async ({
  fault,
  fetch,
  log,
  reportId,
  spaceId,
}: {
  fault: HuntFault;
  fetch: HttpHandler;
  log: ToolingLog;
  reportId: string;
  spaceId: string;
}): Promise<void> => {
  const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });
  // The evals fixture authenticates as the stack's superuser, who is not the Worker's service
  // account, so a private conversation it owns is one the Worker can neither read nor reopen.
  await fetch(spacePath(spaceId, '/api/agent_builder/conversations'), {
    method: 'POST',
    headers: apiVersion(PUBLIC_API_VERSION),
    body: JSON.stringify({
      conversation_id: conversationId,
      title: `Locked Investigation for ${reportId} (hunt-watch eval fault)`,
      access_control: { access_mode: 'private' },
    }),
  });
  log.info(`Staged fault "${fault}" on ${reportId}: private conversation ${conversationId}`);
};

/** The suite never creates the index: Kibana creates it when threat intel bootstraps. */
export const assertThreatReportsIndexExists = async ({ esClient }: { esClient: Client }) => {
  const exists = await esClient.indices.exists({ index: THREAT_REPORTS_INDEX });
  if (!exists) {
    throw new Error(
      `${THREAT_REPORTS_INDEX} does not exist. Kibana creates it when threat intel bootstraps ` +
        'with alertzero enabled; the eval suite refuses to create it (the index is ' +
        '`dynamic: strict`, and a hand-made mapping would hide drift from the shipped one).'
    );
  }
};

const runGenerator = async ({ target, log }: { target: GeneratorTarget; log: ToolingLog }) => {
  log.info(`Seeding Demo C+ pack "${GENERATOR_PACK}" via the data generator`);
  await execa(
    process.execPath,
    [
      GENERATOR_CLI,
      `--packs=${GENERATOR_PACK}`,
      '--threat-intel',
      '--threat-intel-reports',
      `--threat-intel-report-count=${HISTORIC_REPORTS_PER_SCENARIO}`,
      `--kibanaUrl=${target.kibanaUrl}`,
      `--elasticsearchUrl=${target.elasticsearchUrl}`,
      `--username=${target.username}`,
      `--password=${target.password}`,
      '--spaceId=default',
      // The generator needs a window wider than its 24h live reserve to write historic reports,
      // and only warns (does not fail) when it is too narrow.
      '--start-date=180d',
      '--end-date=now',
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  );
};

/**
 * Copies a default-space report under a new `_id`, into another space or back into `default`
 * (the locked-Investigation row needs its own Investigation, not the clean row's). The generator writes
 * telemetry to shared streams, so re-running it per space would duplicate telemetry and change
 * Tier 1 hit counts; copying only the report doc avoids that. Seeded `evidence` is dropped so each
 * copy starts un-hunted.
 */
const copyReportToSpace = async ({
  esClient,
  sourceReportId,
  copyReportId,
  spaceId,
}: {
  esClient: Client;
  sourceReportId: string;
  copyReportId: string;
  spaceId: string;
}) => {
  const { _source: source } = await esClient
    .get<Record<string, unknown>>({ index: THREAT_REPORTS_INDEX, id: sourceReportId })
    .catch((error) => {
      if (!isEsNotFound(error)) throw error;
      throw new Error(
        `Source report ${sourceReportId} is missing from ${THREAT_REPORTS_INDEX}: the generator ` +
          'did not write it (it logs a warning, not an error, when the historic window is too ' +
          'narrow or the post-index pipeline fails). Check the generator output above.'
      );
    });
  if (!source) {
    throw new Error(`Report ${sourceReportId} has no _source; cannot copy into "${spaceId}"`);
  }
  const { evidence: _evidence, ...rest } = source;
  await esClient.index({
    index: THREAT_REPORTS_INDEX,
    id: copyReportId,
    refresh: true,
    document: { ...rest, space_id: spaceId },
  });
};

/** Every report id the suite owns, across spaces. Used for verification and teardown. */
export const ALL_SEEDED_REPORT_IDS: readonly string[] = [
  ...GENERATED_AWS_IAM_REPORT_IDS,
  ...SPACE_COPY_SOURCES.map((c) => c.copyReportId),
  HUNT_REPORT_IDS.canary,
  HUNT_REPORT_IDS.iocDump,
  HUNT_REPORT_IDS.lockedInvestigation,
];

/** Expected `space_id` for each seeded report id. */
export const EXPECTED_REPORT_SPACES: ReadonlyMap<string, string> = new Map([
  ...GENERATED_AWS_IAM_REPORT_IDS.map((id): [string, string] => [id, 'default']),
  ...SPACE_COPY_SOURCES.map((c): [string, string] => [c.copyReportId, c.spaceId]),
  [HUNT_REPORT_IDS.canary, 'default'] as [string, string],
  [HUNT_REPORT_IDS.iocDump, 'default'] as [string, string],
  [HUNT_REPORT_IDS.lockedInvestigation, 'default'] as [string, string],
]);

/**
 * Post-seed check: every bound report id exists in `.kibana-threat-reports` in its expected space.
 * There is no generator dry-run, so this is what stops an empty or drifted stack from scoring.
 */
export const verifySeededReports = async ({ esClient }: { esClient: Client }) => {
  const response = await esClient.search<{ space_id?: string }>({
    index: THREAT_REPORTS_INDEX,
    size: ALL_SEEDED_REPORT_IDS.length,
    _source: ['space_id'],
    query: { ids: { values: [...ALL_SEEDED_REPORT_IDS] } },
  });
  const found = new Map(response.hits.hits.map((hit) => [hit._id, hit._source?.space_id]));

  const missing = ALL_SEEDED_REPORT_IDS.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Seed verification failed: ${missing.length} report id(s) missing from ${THREAT_REPORTS_INDEX}: ` +
        `${missing.join(', ')}. The generator ids may have drifted from the suite's constants.`
    );
  }

  const wrongSpace = ALL_SEEDED_REPORT_IDS.filter(
    (id) => found.get(id) !== EXPECTED_REPORT_SPACES.get(id)
  ).map((id) => `${id} (found "${found.get(id)}", expected "${EXPECTED_REPORT_SPACES.get(id)}")`);
  if (wrongSpace.length > 0) {
    throw new Error(`Seed verification failed: wrong space_id for ${wrongSpace.join('; ')}`);
  }
};

export const deleteSeededReports = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}) => {
  try {
    await esClient.deleteByQuery({
      index: THREAT_REPORTS_INDEX,
      conflicts: 'proceed',
      refresh: true,
      query: { ids: { values: [...ALL_SEEDED_REPORT_IDS] } },
    });
  } catch (error) {
    if (!isEsNotFound(error)) throw error;
  }
  log.debug(`Deleted ${ALL_SEEDED_REPORT_IDS.length} seeded threat report id(s)`);
};

/**
 * Suite teardown for what scored runs leave behind on a reused stack: pending Proposals (and the
 * gate workflows waiting on them) and Investigation conversations on every seeded report. Each
 * report is settled the way the per-row reset settles it. Best effort per report, so one that
 * will not settle does not stop the rest, or the report deletion after it.
 */
export const settleSeededReports = async ({
  esClient,
  fetch,
  log,
}: {
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  for (const [reportId, spaceId] of EXPECTED_REPORT_SPACES) {
    try {
      await resetHuntReport({ esClient, fetch, log, reportId, spaceId });
    } catch (error) {
      log.warning(`Teardown could not settle ${reportId} in "${spaceId}": ${errorMessage(error)}`);
    }
  }
};

/**
 * Seeds everything the quality, approval, and isolation specs need, once per worker: generator
 * pack, space copies, and the canary. Returns a teardown that settles every seeded report's
 * Proposals and Investigation, then removes the seeded reports.
 */
export const seedHuntData = async ({
  esClient,
  fetch,
  log,
  target,
}: {
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
  target: GeneratorTarget;
}): Promise<() => Promise<void>> => {
  await assertThreatReportsIndexExists({ esClient });
  await runGenerator({ target, log });
  await settleHuntScope({ esClient, log });

  for (const { spaceId, sourceReportId, copyReportId } of SPACE_COPY_SOURCES) {
    await copyReportToSpace({ esClient, sourceReportId, copyReportId, spaceId });
  }

  const now = new Date().toISOString();
  await esClient.index({
    index: THREAT_REPORTS_INDEX,
    id: HUNT_REPORT_IDS.canary,
    refresh: true,
    document: buildCanaryReportDoc(now),
  });
  await esClient.index({
    index: THREAT_REPORTS_INDEX,
    id: HUNT_REPORT_IDS.iocDump,
    refresh: true,
    document: buildIocDumpReportDoc(now),
  });
  // Same content as the golden clean report; only its Investigation differs, and the fault stages
  // that per run. A copy keeps the clean row's own Investigation out of the locked row's reach.
  await copyReportToSpace({
    esClient,
    sourceReportId: HUNT_REPORT_IDS.clean,
    copyReportId: HUNT_REPORT_IDS.lockedInvestigation,
    spaceId: DEFAULT_EVAL_SPACE_ID,
  });

  await verifySeededReports({ esClient });
  log.info(`Seeded and verified ${ALL_SEEDED_REPORT_IDS.length} threat report(s)`);

  return async () => {
    await settleSeededReports({ esClient, fetch, log });
    await deleteSeededReports({ esClient, log });
  };
};

interface ProposalsListResponse {
  proposals: Array<{ id: string; status?: string }>;
}

const listOpenProposals = async ({
  fetch,
  spaceId,
  conversationId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
}): Promise<ProposalsListResponse['proposals']> => {
  const open: ProposalsListResponse['proposals'] = [];
  for (const status of OPEN_PROPOSAL_STATUSES) {
    const page = await fetch<ProposalsListResponse>(spacePath(spaceId, PROPOSALS_INTERNAL_URL), {
      method: 'GET',
      headers: apiVersion(PROPOSALS_API_VERSION),
      query: { conversationId, status, excludeSuperseded: true, size: 100 },
    });
    open.push(...page.proposals);
  }
  return open;
};

/**
 * Per-example reset so a rerun of the same report starts fresh: dismiss pending Proposals on the
 * report's Investigation and wait for them to settle, delete the Investigation conversation at
 * its deterministic id, and clear `evidence` on the report doc. Reset-only: scored tasks never
 * call dismiss.
 */
export const resetHuntReport = async ({
  esClient,
  fetch,
  log,
  reportId,
  spaceId,
}: {
  esClient: Client;
  fetch: HttpHandler;
  log: ToolingLog;
  reportId: string;
  spaceId: string;
}) => {
  const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });

  // An Investigation with no Proposals lists as empty, so a failure here is a real one. Swallowing
  // it would skip the dismiss, and the Worker would then skip the report as `open_proposal` with
  // nothing in the run log to say why.
  const open = await listOpenProposals({ fetch, spaceId, conversationId });

  // Only a pending Proposal can be dismissed; an executing one settles on its own.
  for (const { id } of open.filter((p) => p.status === 'pending')) {
    await fetch(spacePath(spaceId, PROPOSAL_DISMISS_URL.replace('{id}', encodeURIComponent(id))), {
      method: 'POST',
      headers: apiVersion(PROPOSALS_API_VERSION),
      body: JSON.stringify({ dismissReason: 'no_reason', rationale: 'eval pre-run reset' }),
    });
  }

  // Dismiss only resumes the Proposal's gate workflow; the status flips to `no_action` when that
  // workflow settles, seconds later. The Worker's candidate query skips a report whose
  // Investigation still carries a pending Proposal (`open_proposal`), so triggering before the
  // flip lands makes the row silently score nothing. Wait for the same condition the query reads.
  if (open.length > 0) {
    const deadline = Date.now() + 90_000;
    let remaining = open;
    while (remaining.length > 0 && Date.now() < deadline) {
      await sleep(2_000);
      remaining = await listOpenProposals({ fetch, spaceId, conversationId });
    }
    if (remaining.length > 0) {
      throw new Error(
        `resetHuntReport(${reportId}): ${remaining.length} Proposal(s) still open after dismiss ` +
          `(${remaining.map((p) => `${p.id}:${p.status}`).join(', ')}); the Worker would skip ` +
          `this report as open_proposal.`
      );
    }
    log.debug(`Dismissed ${open.length} Proposal(s) on ${conversationId} and they settled`);
  }

  await fetch(
    spacePath(spaceId, `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`),
    { method: 'DELETE', headers: apiVersion(PUBLIC_API_VERSION) }
  ).catch((error) => {
    if (httpStatus(error) !== 404) throw error;
  });

  try {
    await esClient.update({
      index: THREAT_REPORTS_INDEX,
      id: reportId,
      refresh: true,
      doc: { evidence: null },
    });
  } catch (error) {
    // Unknown ids (the `no-candidates` row) have no doc to clear.
    if (!isEsNotFound(error)) throw error;
  }
};
