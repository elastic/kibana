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
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_DISMISS_URL,
} from '@kbn/proposals-common';
import {
  GENERATED_AWS_IAM_REPORT_IDS,
  HISTORIC_REPORTS_PER_SCENARIO,
  HUNT_REPORT_IDS,
  PUBLIC_API_VERSION,
  SPACE_COPY_SOURCES,
  THREAT_REPORTS_INDEX,
} from './constants';

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
 * Mirrors `HUNT_INVESTIGATION_ID_NAMESPACE` and the frozen namespace uuid in the alertzero
 * plugin (`common/constants.ts`, `hunt_investigation_id.ts`). Neither is exported from a package,
 * so `seed_contract.test.ts` reads those files as text to catch drift.
 */
export const HUNT_INVESTIGATION_ID_NAMESPACE = 'hunt:report:';
export const HUNT_INVESTIGATION_UUID_NAMESPACE = '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50';

export const buildHuntInvestigationConversationId = (reportId: string): string =>
  uuidv5(`${HUNT_INVESTIGATION_ID_NAMESPACE}${reportId}`, HUNT_INVESTIGATION_UUID_NAMESPACE);

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

const isNotFound = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

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
 * Copies a default-space report into another space under a suffixed `_id`. The generator writes
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
      if (!isNotFound(error)) throw error;
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
];

/** Expected `space_id` for each seeded report id. */
export const EXPECTED_REPORT_SPACES: ReadonlyMap<string, string> = new Map([
  ...GENERATED_AWS_IAM_REPORT_IDS.map((id): [string, string] => [id, 'default']),
  ...SPACE_COPY_SOURCES.map((c): [string, string] => [c.copyReportId, c.spaceId]),
  [HUNT_REPORT_IDS.canary, 'default'] as [string, string],
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
    if (!isNotFound(error)) throw error;
  }
  log.debug(`Deleted ${ALL_SEEDED_REPORT_IDS.length} seeded threat report id(s)`);
};

/**
 * Seeds everything the quality, approval, and isolation specs need, once per worker: generator
 * pack, space copies, and the canary. Returns a teardown that removes the seeded reports.
 */
export const seedHuntData = async ({
  esClient,
  log,
  target,
}: {
  esClient: Client;
  log: ToolingLog;
  target: GeneratorTarget;
}): Promise<() => Promise<void>> => {
  await assertThreatReportsIndexExists({ esClient });
  await runGenerator({ target, log });

  for (const { spaceId, sourceReportId, copyReportId } of SPACE_COPY_SOURCES) {
    await copyReportToSpace({ esClient, sourceReportId, copyReportId, spaceId });
  }

  await esClient.index({
    index: THREAT_REPORTS_INDEX,
    id: HUNT_REPORT_IDS.canary,
    refresh: true,
    document: buildCanaryReportDoc(new Date().toISOString()),
  });

  await verifySeededReports({ esClient });
  log.info(`Seeded and verified ${ALL_SEEDED_REPORT_IDS.length} threat report(s)`);

  return async () => {
    await deleteSeededReports({ esClient, log });
  };
};

interface ProposalsListResponse {
  proposals: Array<{ id: string }>;
}

/**
 * Per-example reset so a rerun of the same report starts fresh: dismiss pending Proposals on the
 * report's Investigation, delete the Investigation conversation at its deterministic id, and
 * clear `evidence` on the report doc. Reset-only: scored tasks never call dismiss.
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
  const conversationId = buildHuntInvestigationConversationId(reportId);
  const spacePrefix = `/s/${encodeURIComponent(spaceId)}`;

  const pending = await fetch<ProposalsListResponse>(`${spacePrefix}${PROPOSALS_INTERNAL_URL}`, {
    method: 'GET',
    version: PROPOSALS_API_VERSION,
    headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
    query: { conversationId, status: 'pending' },
  }).catch((error) => {
    log.debug(`Could not list proposals for ${conversationId}: ${String(error)}`);
    return { proposals: [] };
  });

  for (const { id } of pending.proposals) {
    await fetch(`${spacePrefix}${PROPOSAL_DISMISS_URL.replace('{id}', encodeURIComponent(id))}`, {
      method: 'POST',
      version: PROPOSALS_API_VERSION,
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION, 'kbn-xsrf': 'true' },
      body: JSON.stringify({ dismissReason: 'no_reason', rationale: 'eval pre-run reset' }),
    });
  }

  await fetch(
    `${spacePrefix}/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'DELETE',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION, 'kbn-xsrf': 'true' },
    }
  ).catch((error) => {
    // 404 means there was nothing to delete. The scout fetch wrapper surfaces it only in the
    // message (`Status: 404`), not as a structured status.
    if (!/Status: 404|404 Not Found/.test(String(error))) throw error;
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
    if (!isNotFound(error)) throw error;
  }
};
