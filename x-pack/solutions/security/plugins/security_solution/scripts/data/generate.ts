/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import datemath from '@kbn/datemath';
import { asyncForEach } from '@kbn/std';
import type { Client } from '@elastic/elasticsearch';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KbnClient } from '@kbn/test';

import { createEsClient, createKbnClient } from './lib/clients';
import type { EpisodeDocs, EpisodeFileSet, ScaledDoc } from './lib/episodes';
import { loadEpisode, scaleEpisodes } from './lib/episodes';
import type { StackAuth } from './lib/clients';
import { formatError, getStatusCode } from './lib/type_guards';
import {
  dateSuffixesBetween,
  ensureIndex,
  episodeIndexNames,
  scriptsDataDir,
} from './lib/indexing';
import { assertNoBulkErrors } from './lib/bulk';
import { ensurePrebuiltRulesInstalled } from './lib/prebuilt_rules';
import { loadInsightsRuleCreateProps } from './lib/insights_rule';
import { copyPreviewAlertsToRealAlertsIndex, previewRule } from './lib/rule_preview';
import {
  enableRules,
  fetchAllInstalledRules,
  fetchRuleById,
  toRuleCreateProps,
} from './lib/ruleset';
import {
  generateAndIndexAttackDiscoveries,
  type GeneratedAttackDiscoveryGroup,
} from './lib/attack_discoveries';

const ATTACKS_DIR = scriptsDataDir('episodes', 'attacks');
const NOISE_DIR = scriptsDataDir('episodes', 'noise');
const MAPPING_PATH = path.join(ATTACKS_DIR, 'mapping.json');
const DATA_GENERATOR_CASE_TAG = 'data-generator';
const TARGET_PREBUILT_RULES_COUNT = 15;

const normalizeApiKey = (input: string): string => input.trim().replace(/^ApiKey\s+/i, '');

const looksLikeLogsDataStreamPrefix = (indexPrefix: string): boolean => {
  // Built-in/serverless "logs" composable templates commonly target data streams only with patterns like `logs-*-*`.
  // If indexPrefix itself matches `logs-*-*`, then `${indexPrefix}.events...` will also match and ES will reject
  // concrete index creation with:
  // "cannot create index ... because it matches with template [logs] that creates data streams only"
  return /^logs-[^-]+-/.test(indexPrefix);
};

const ensureDetectionsInitialized = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}) => {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/detection_engine/index',
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
      },
    });
  } catch (e) {
    // Lack of privileges is common in dev serverless. We'll detect missing indices later and skip alerts cleanly.
    log.warning(
      `Detections index initialization request failed (may be missing privileges); continuing. ${formatError(
        e
      )}`
    );
  }
};

const alertsDataStreamExists = async ({
  esClient,
  spaceId,
}: {
  esClient: Client;
  spaceId: string;
}): Promise<boolean> => {
  const dest = `.alerts-security.alerts-${spaceId}`;
  try {
    await esClient.indices.getDataStream({ name: dest });
    return true;
  } catch (e) {
    const status = getStatusCode(e);
    if (status === 404) return false;
    // Fallback for non-serverless (alias/index)
    try {
      return await esClient.indices.exists({ index: dest });
    } catch {
      throw e;
    }
  }
};

const parseDateMathOrThrow = (input: string, nowMs: number): number => {
  if (input === 'now') return nowMs;

  // Support shorthand like "60d" meaning "now-60d"
  const m = input.match(/^(\d+)([smhdwMy])$/);
  if (m) {
    const amount = Number(m[1]);
    const unit = m[2];
    const expr = `now-${amount}${unit}`;
    const parsed = datemath.parse(expr, { forceNow: new Date(nowMs) });
    if (!parsed?.isValid()) throw new Error(`Invalid date math: ${input}`);
    return parsed.valueOf();
  }

  const parsed = datemath.parse(input, { forceNow: new Date(nowMs) });
  if (!parsed?.isValid()) throw new Error(`Invalid date math: ${input}`);
  return parsed.valueOf();
};

const resolveEpisodeFile = (dir: string, filenameBase: string): string | undefined => {
  const gz = path.join(dir, `${filenameBase}.ndjson.gz`);
  if (fs.existsSync(gz)) return gz;
  const plain = path.join(dir, `${filenameBase}.ndjson`);
  if (fs.existsSync(plain)) return plain;
  return undefined;
};

const listEpisodeFileSets = (selected: Set<string>): EpisodeFileSet[] => {
  const fileSets: EpisodeFileSet[] = [];
  for (const epId of [...selected].sort()) {
    const data =
      resolveEpisodeFile(ATTACKS_DIR, `${epId}data`) ??
      resolveEpisodeFile(NOISE_DIR, `${epId}data`);
    const alerts =
      resolveEpisodeFile(ATTACKS_DIR, `${epId}alerts`) ??
      resolveEpisodeFile(NOISE_DIR, `${epId}alerts`);
    if (!data || !alerts) {
      throw new Error(
        `Episode ${epId} is missing files. Expected ${epId}data(.ndjson|.ndjson.gz) and ${epId}alerts(.ndjson|.ndjson.gz) in ${ATTACKS_DIR} or ${NOISE_DIR}`
      );
    }
    fileSets.push({
      episodeId: epId,
      dataPath: data,
      alertsPath: alerts,
    });
  }
  return fileSets;
};

const assertPositiveInt = (name: string, value: number) => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Got: ${String(value)}`);
  }
};

const parseEpisodesFlag = (value: string | undefined): Set<string> => {
  if (!value)
    return new Set(['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8', 'noise1', 'noise2']);
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith('ep')) return p;
      if (/^\d+$/.test(p)) return `ep${p}`;
      return p;
    });
  return new Set(parts);
};

const stableSampleScore = (input: string): number => {
  // Deterministic score to pick a stable sample for --cases, without using bitwise ops.
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16);
};

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

const getCaseTimestampIso = ({
  discoveryTimeIso,
  key,
}: {
  discoveryTimeIso: string;
  key: string;
}): string => {
  // Requirement: case timestamps must be within 12 hours AFTER the attack discovery timestamp.
  const baseMs = new Date(discoveryTimeIso).getTime();
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  const offsetMs = stableSampleScore(key) % (twelveHoursMs + 1);
  const tsMs = clamp(baseMs + offsetMs, baseMs, baseMs + twelveHoursMs);
  return new Date(tsMs).toISOString();
};

const buildAttackDiscoveryCaseTitle = (d: GeneratedAttackDiscoveryGroup): string => {
  return d.title;
};

const buildAttackDiscoveryCaseComment = (d: GeneratedAttackDiscoveryGroup): string => {
  const title = buildAttackDiscoveryCaseTitle(d);
  const hostLine = d.hostName ? `Host \`${d.hostName}\`` : 'Host `unknown`';
  const userLine = d.userName ? ` User \`${d.userName}\`` : '';
  const hostBullet = d.hostName ? `- Host: \`${d.hostName}\`` : '';
  const userBullet = d.userName ? `- User: \`${d.userName}\`` : '';

  return `## ${title}

${hostLine}${userLine}

### Summary
Detected ${d.alertIds.length} alert(s) that appear related.

### Details
This synthetic attack discovery groups alerts that occurred close in time for investigation.

- Alerts: ${d.alertIds.length}
${hostBullet}
${userBullet}
`;
};

const createCasesFromAttackDiscoveries = async ({
  kbnClient,
  log,
  discoveries,
  alertsIndex,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  discoveries: GeneratedAttackDiscoveryGroup[];
  alertsIndex: string;
}): Promise<void> => {
  if (discoveries.length === 0) {
    log.info(`--cases enabled, but there are no Attack Discoveries to turn into cases.`);
    return;
  }

  const desired = Math.max(1, Math.round(discoveries.length * 0.5));
  const selected = [...discoveries]
    .map((d) => {
      const key = [
        d.discoveryTimeIso,
        d.hostName ?? 'unknown-host',
        d.userName ?? 'unknown-user',
        d.alertIds.join(','),
      ].join('|');
      return { d, key, score: stableSampleScore(key) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, desired)
    .map(({ d, key }) => ({ d, key }));

  log.info(`--cases enabled: creating ${selected.length}/${discoveries.length} cases (~50%).`);

  for (const { d, key } of selected) {
    const title = buildAttackDiscoveryCaseTitle(d);
    const description = `This case was opened for attack discovery: _${title}_`;

    const created = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/cases',
      headers: {
        'kbn-xsrf': 'true',
      },
      body: {
        title,
        tags: [DATA_GENERATOR_CASE_TAG],
        category: null,
        severity: 'low',
        description,
        assignees: [],
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: true, extractObservables: true },
        owner: 'securitySolution',
        customFields: [],
      },
    });

    const caseId = created.data.id;
    const attachments = [
      {
        comment: buildAttackDiscoveryCaseComment(d),
        type: 'user',
        owner: 'securitySolution',
      },
      ...d.alertIds.map((alertId) => ({
        alertId,
        index: alertsIndex,
        rule: { id: null, name: null },
        type: 'alert',
        owner: 'securitySolution',
      })),
    ];

    await kbnClient.request({
      method: 'POST',
      path: `/internal/cases/${caseId}/attachments/_bulk_create`,
      headers: {
        'kbn-xsrf': 'true',
        // This matches what the UI sends and is commonly required for /internal/* routes.
        'x-elastic-internal-origin': 'Kibana',
      },
      body: attachments,
    });

    // Override saved object timestamps to be near the discovery timestamp.
    // The public Cases API always uses "now" for created_at / updated_at, so we patch the underlying saved object.
    // IMPORTANT: do NOT write directly to `.kibana_alerting_cases` via Elasticsearch; it is a restricted index.
    const timestampIso = getCaseTimestampIso({ discoveryTimeIso: d.discoveryTimeIso, key });
    try {
      // Provide `retries` so response errors are wrapped and include the response body in the error message.
      await kbnClient.request({
        method: 'PUT',
        path: `/internal/security_solution/data_generator/cases/${caseId}/timestamps`,
        retries: 1,
        headers: {
          'elastic-api-version': '1',
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
        body: {
          timestamp: timestampIso,
        },
      });
    } catch (e) {
      // case creation/attachments should still succeed even if timestamp patching fails.
      log.warning(`--cases: failed to set case timestamps for caseId=${caseId}: ${formatError(e)}`);
    }
  }
};

const deleteGeneratedCases = async ({
  kbnClient,
  log,
  authenticatedUsername,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  authenticatedUsername: string;
}): Promise<void> => {
  interface FindCasesResponse {
    cases: Array<{ id: string }>;
    total: number;
  }

  const findCaseIds = async (query: Record<string, unknown>): Promise<string[]> => {
    const perPage = 100;
    let page = 1;
    const ids: string[] = [];

    while (true) {
      const resp = await kbnClient.request<FindCasesResponse>({
        method: 'GET',
        path: '/api/cases/_find',
        headers: { 'kbn-xsrf': 'true' },
        query: { ...query, page, perPage },
      });

      const pageIds = resp.data.cases.map((c) => c.id).filter(Boolean);
      ids.push(...pageIds);

      if (ids.length >= resp.data.total || pageIds.length === 0) break;
      page++;
    }

    return ids;
  };

  const deleteByIds = async (caseIds: string[]) => {
    const batchSize = 50;
    for (let i = 0; i < caseIds.length; i += batchSize) {
      const batch = caseIds.slice(i, i + batchSize);
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/cases',
        headers: { 'kbn-xsrf': 'true' },
        query: { ids: JSON.stringify(batch) },
      });
    }
  };

  try {
    // Primary: safe deletion by generator tag.
    const tagged = await findCaseIds({
      owner: 'securitySolution',
      tags: DATA_GENERATOR_CASE_TAG,
    });

    // Backwards-compatibility: older generator cases created before tagging existed.
    // Keep this narrow by filtering to the reporter and owner, and searching only the description field.
    const legacy = await findCaseIds({
      owner: 'securitySolution',
      reporters: authenticatedUsername,
      search: '"This case was opened for attack discovery"',
      searchFields: 'description',
    });

    const caseIds = Array.from(new Set([...tagged, ...legacy]));
    if (caseIds.length === 0) {
      log.info(`--clean: no generator-created cases found to delete.`);
      return;
    }

    log.warning(`--clean: deleting ${caseIds.length} generator-created case(s).`);
    await deleteByIds(caseIds);
  } catch (e) {
    log.warning(`--clean: failed to delete generator-created cases: ${formatError(e)}`);
  }
};

const clearPreviewAlertsDocuments = async ({
  esClient,
  log,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  // Rule preview writes into the preview alerts backing index using bulk `create`.
  // If documents already exist with the same IDs (e.g. repeated generator runs), preview can fail with 409 conflicts.
  // We intentionally delete *documents only* (not the index), so the preview index remains usable.
  const previewInternalAlias = `.internal.preview.alerts-security.alerts-${spaceId}`;
  try {
    const exists = await esClient.indices.exists({ index: previewInternalAlias });
    if (!exists) return;

    await esClient.deleteByQuery({
      index: previewInternalAlias,
      conflicts: 'proceed',
      refresh: true,
      query: { match_all: {} },
    });
    log.info(`Cleared existing preview alert documents from ${previewInternalAlias}`);
  } catch (e) {
    log.warning(
      `Failed to clear preview alert documents from ${previewInternalAlias}: ${formatError(e)}`
    );
  }
};

const ensureGeneratorIndices = async ({
  esClient,
  endMs,
  episodeIds,
  log,
  indexPrefix,
}: {
  esClient: Client;
  endMs: number;
  episodeIds: string[];
  log: ToolingLog;
  indexPrefix: string;
}) => {
  for (const ep of episodeIds) {
    const idx = episodeIndexNames({ episodeId: ep, endMs, indexPrefix });
    await asyncForEach(Object.values(idx), async (index) => {
      await ensureIndex({ esClient, index, mappingPath: MAPPING_PATH, log });
    });
  }
};

const cleanGeneratedData = async ({
  esClient,
  kbnClient,
  log,
  episodeIds,
  endMs,
  spaceId,
  startMs,
  username,
  ruleUuids,
  ruleIds,
  indexPrefix,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  episodeIds: string[];
  endMs: number;
  spaceId: string;
  startMs: number;
  username: string;
  ruleUuids: string[];
  ruleIds: string[];
  indexPrefix: string;
}) => {
  log.warning(
    `--clean enabled: deleting generated episode indices and generated alerts/discoveries in space "${spaceId}" within the requested time range`
  );

  // 1) Remove episode indices created by this script for the selected episodeIds across the requested date range.
  // Indices are suffixed by UTC day (YYYY.MM.DD), so we delete all day-suffixed indices that overlap the range.
  const suffixes = dateSuffixesBetween(startMs, endMs);
  const episodeIndices = episodeIds.flatMap((ep) =>
    suffixes.flatMap((suffix) => {
      const idx = episodeIndexNames({
        episodeId: ep,
        endMs,
        indexPrefix,
        dateSuffixOverride: suffix,
      });
      return [idx.endpointEvents, idx.endpointAlerts, idx.insightsAlerts];
    })
  );

  try {
    // Delete in small batches to avoid `too_long_http_line_exception` from very long URLs.
    const batchSize = 10;
    for (let i = 0; i < episodeIndices.length; i += batchSize) {
      const batch = episodeIndices.slice(i, i + batchSize);
      await esClient.indices.delete({
        index: batch,
        ignore_unavailable: true,
      });
    }
  } catch (e) {
    log.warning(`--clean: failed to delete episode indices: ${formatError(e)}`);
  }

  // 2) Remove previously generated Security alerts (copied from preview).
  // Prefer deleting by our generator marker tag; fallback to ruleset-based filters if needed.
  const alertsIndex = `.alerts-security.alerts-${spaceId}`;
  const hasRuleFilters = ruleUuids.length > 0 || ruleIds.length > 0;
  if (hasRuleFilters) {
    try {
      const exists = await esClient.indices.exists({ index: alertsIndex });
      if (exists) {
        await esClient.deleteByQuery({
          index: alertsIndex,
          conflicts: 'proceed',
          refresh: true,
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      // Prefer deleting alerts explicitly marked by the generator.
                      { term: { 'kibana.alert.rule.tags': 'data-generator' } },
                      // Backwards compatibility: delete by ruleset filters too (older generated docs won't have the tag).
                      ...(ruleUuids.length > 0
                        ? [{ terms: { 'kibana.alert.rule.uuid': ruleUuids } }]
                        : []),
                      ...(ruleIds.length > 0
                        ? [{ terms: { 'kibana.alert.rule.rule_id': ruleIds } }]
                        : []),
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        });
      }
    } catch (e) {
      log.warning(
        `--clean: failed to delete Security alerts from ${alertsIndex}: ${formatError(e)}`
      );
    }
  } else {
    log.warning(
      `--clean: skipping Security alert deletion because no prebuilt rules were resolved.`
    );
  }

  // 3) Remove previously generated Attack Discoveries (synthetic/no-LLM) within the requested time range.
  //
  // We currently persist generated Attack Discoveries into the standard Attack Discovery alerts-as-data index
  // (`.alerts-security.attack.discovery.alerts-<space>`). Older versions wrote to the `.adhoc` variant; we
  // clean both for good measure.
  const attackDiscoveryAlias = `.alerts-security.attack.discovery.alerts-${spaceId}`;
  const adhocDiscoveryAlias = `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`;
  try {
    const deleteQuery = {
      bool: {
        filter: [
          { term: { 'kibana.alert.attack_discovery.api_config.name': 'Synthetic (no-LLM)' } },
          {
            range: {
              '@timestamp': {
                gte: new Date(startMs).toISOString(),
                lte: new Date(endMs).toISOString(),
              },
            },
          },
        ],
        should: [
          // Prefer deleting discoveries explicitly tagged by the generator.
          { term: { tags: 'data_generator' } },
          { term: { 'kibana.alert.rule.tags': 'data_generator' } },
        ],
        minimum_should_match: 1,
      },
    };

    const exists = await esClient.indices.exists({ index: attackDiscoveryAlias });
    if (exists) {
      await esClient.deleteByQuery({
        index: attackDiscoveryAlias,
        conflicts: 'proceed',
        refresh: true,
        query: deleteQuery,
      });
    }

    const adhocExists = await esClient.indices.exists({ index: adhocDiscoveryAlias });
    if (adhocExists) {
      await esClient.deleteByQuery({
        index: adhocDiscoveryAlias,
        conflicts: 'proceed',
        refresh: true,
        query: deleteQuery,
      });
    }
  } catch (e) {
    log.warning(
      `--clean: failed to delete Attack Discoveries from ${attackDiscoveryAlias} (and/or ${adhocDiscoveryAlias}): ${formatError(
        e
      )}`
    );
  }

  // 4) Remove previously generated Cases created by this script.
  await deleteGeneratedCases({ kbnClient, log, authenticatedUsername: username });

  // NOTE: Do NOT delete preview indices here.
  // The Rule Preview API may not recreate them automatically in all dev setups, which can lead
  // to "no preview alerts were written" on subsequent runs.
};

const ensurePreviewAlertsIndex = async ({
  esClient,
  log,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}) => {
  const previewAlias = `.preview.alerts-security.alerts-${spaceId}`;
  const previewInternalAlias = `.internal.preview.alerts-security.alerts-${spaceId}`;
  const previewBackingIndex = `${previewInternalAlias}-000001`;

  const exists = await esClient.indices.exists({ index: previewAlias });
  if (exists) return;

  // If the preview index was deleted, Rule Preview might not recreate it automatically.
  // Recreate it by cloning the mappings from the real Security alerts backing index.
  const resolveBackingIndexFromAlias = async (alias: string): Promise<string | undefined> => {
    try {
      const resp = await esClient.indices.getAlias({ name: alias });
      const indices = Object.keys(resp);
      return indices.sort()[0];
    } catch (e) {
      // Alias might not exist (404) or caller might not have privileges.
      return undefined;
    }
  };

  const realAlertsBackingIndex =
    (await resolveBackingIndexFromAlias(`.internal.alerts-security.alerts-${spaceId}`)) ??
    (await resolveBackingIndexFromAlias(`.alerts-security.alerts-${spaceId}`));

  if (!realAlertsBackingIndex) {
    log.warning(
      `Preview alerts index ${previewAlias} is missing, but cannot recreate it because the real Security alerts backing index could not be resolved. ` +
        `Initialize detections (Security app) and re-run.`
    );
    return;
  }

  try {
    const mappingResp: IndicesGetMappingResponse = await esClient.indices.getMapping({
      index: realAlertsBackingIndex,
    });
    const mapping = mappingResp[realAlertsBackingIndex]?.mappings;

    log.info(`Recreating missing preview alerts backing index: ${previewBackingIndex}`);
    await esClient.indices.create({
      index: previewBackingIndex,
      settings: {
        // The alerts mapping is large; ensure we don't fail with:
        // "Limit of total fields [1000] has been exceeded"
        'index.mapping.total_fields.limit': '6000',
        index: { hidden: true },
      },
      mappings: mapping,
      aliases: {
        [previewAlias]: {},
        [previewInternalAlias]: {},
      },
    });
  } catch (e) {
    log.warning(`Failed to recreate preview alerts index ${previewAlias}: ${formatError(e)}`);
  }
};

const bulkIndexStreamed = async ({
  esClient,
  endMs,
  episodeIds,
  log,
  docs,
  indexPrefix,
}: {
  esClient: Client;
  endMs: number;
  episodeIds: string[];
  log: ToolingLog;
  docs: AsyncGenerator<ScaledDoc>;
  indexPrefix: string;
}) => {
  const buffers = new Map<string, Array<Record<string, unknown>>>();
  const indexedCounts = new Map<string, number>();
  const flush = async (index: string) => {
    const batch = buffers.get(index) ?? [];
    if (batch.length === 0) return;
    buffers.set(index, []);
    const body = batch.flatMap((doc) => [{ index: { _index: index } }, doc]);
    const resp = await esClient.bulk({ refresh: false, body });
    assertNoBulkErrors(index, resp, log);
    indexedCounts.set(index, (indexedCounts.get(index) ?? 0) + batch.length);
  };

  const ensureBuf = (index: string) => {
    if (!buffers.has(index)) buffers.set(index, []);
    return buffers.get(index) ?? [];
  };

  for await (const item of docs) {
    if (episodeIds.includes(item.episodeId)) {
      const idx = episodeIndexNames({ episodeId: item.episodeId, endMs, indexPrefix });
      const index =
        item.kind === 'data'
          ? idx.endpointEvents
          : item.kind === 'endpoint_alert'
          ? idx.endpointAlerts
          : idx.insightsAlerts;

      const buf = ensureBuf(index);
      buf.push(item.doc);
      if (buf.length >= 1000) await flush(index);
    }
  }

  for (const index of buffers.keys()) {
    await flush(index);
  }

  // Ensure the freshly indexed docs are visible to searches before rule preview runs.
  // Without this, rule preview can intermittently see 0 docs until the next refresh interval.
  try {
    const indices = [...buffers.keys()];
    if (indices.length > 0) {
      await esClient.indices.refresh({ index: indices });
      log.info(`Refreshed ${indices.length} episode indices`);
    }
  } catch (e) {
    log.warning(
      `Failed to refresh episode indices; rule preview may miss newly indexed docs: ${formatError(
        e
      )}`
    );
  }

  for (const [index, count] of [...indexedCounts.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    log.info(`Indexed ${count} docs into ${index}`);
  }
};

export const cli = () => {
  type CliFlags = Record<string, unknown>;
  const getStringFlag = (flags: CliFlags, name: string): string => {
    const v = flags[name];
    if (typeof v === 'string') return v;
    throw new Error(`Missing required --${name} (expected string)`);
  };
  const getOptionalStringFlag = (flags: CliFlags, name: string): string | undefined => {
    const v = flags[name];
    if (v == null) return undefined;
    if (typeof v === 'string') return v;
    throw new Error(`Invalid --${name} (expected string)`);
  };

  run(
    // eslint-disable-next-line complexity
    async (cliContext) => {
      const log = cliContext.log;

      const nowMs = Date.now();
      const startMs = parseDateMathOrThrow(getStringFlag(cliContext.flags, 'start-date'), nowMs);
      const endMs = parseDateMathOrThrow(getStringFlag(cliContext.flags, 'end-date'), nowMs);

      const events = Number(cliContext.flags.n ?? cliContext.flags.events ?? 100);
      const hosts = Number(cliContext.flags.h ?? cliContext.flags.hosts ?? 5);
      const users = Number(cliContext.flags.u ?? cliContext.flags.users ?? 5);
      const clean = Boolean(cliContext.flags.clean);
      const skipAlerts = Boolean(cliContext.flags['skip-alerts']);
      const skipRulesetPreview = Boolean(cliContext.flags['skip-ruleset-preview']);
      const validateFixtures = Boolean(cliContext.flags['validate-fixtures']);
      const attacks = Boolean(cliContext.flags.attacks);
      const createCases = Boolean(cliContext.flags.cases);
      const shouldGenerateAttackDiscoveries = attacks || createCases;
      const shouldCreateCases = createCases;
      const maxPreviewInvocations = Math.max(
        1,
        Number(cliContext.flags['max-preview-invocations'] ?? 12)
      );

      if (createCases && !attacks) {
        log.info(`--cases enabled: implicitly enabling --attacks.`);
      }

      assertPositiveInt('events', events);
      assertPositiveInt('hosts', hosts);
      assertPositiveInt('users', users);
      if (endMs <= startMs) {
        throw new Error(
          `Invalid time range: end-date must be after start-date. Got start=${new Date(
            startMs
          ).toISOString()} end=${new Date(endMs).toISOString()}`
        );
      }

      const episodes = parseEpisodesFlag(getOptionalStringFlag(cliContext.flags, 'episodes'));
      const episodeIds = [...episodes].sort();

      const kibanaUrl = getStringFlag(cliContext.flags, 'kibanaUrl');
      const elasticsearchUrl = getStringFlag(cliContext.flags, 'elasticsearchUrl');
      const username = getStringFlag(cliContext.flags, 'username');
      const password = getStringFlag(cliContext.flags, 'password');
      const apiKey =
        getOptionalStringFlag(cliContext.flags, 'apiKey') ??
        process.env.ES_API_KEY ??
        process.env.ELASTIC_API_KEY;
      const spaceId = getOptionalStringFlag(cliContext.flags, 'spaceId');
      const indexPrefix = getOptionalStringFlag(cliContext.flags, 'indexPrefix') ?? 'logs-endpoint';

      const auth: StackAuth = apiKey
        ? { type: 'apiKey', apiKey: normalizeApiKey(apiKey) }
        : { type: 'basic', username, password };

      if (auth.type === 'apiKey' && looksLikeLogsDataStreamPrefix(indexPrefix)) {
        // Fail fast with actionable guidance. In serverless ES, creating a concrete index that matches
        // a data-stream-only template is rejected; users commonly hit this by picking prefixes like
        // `logs-endpoint-generator` (which matches `logs-*-*`).
        throw new Error(
          `Invalid --indexPrefix "${indexPrefix}" for serverless/API key mode. ` +
            `It matches the "logs" data-stream-only templates (e.g. logs-*-*), so Elasticsearch rejects concrete index creation. ` +
            `Use a prefix that does NOT match logs-*-* (for example: "logs-endpoint_generator" or keep the default "logs-endpoint").`
        );
      }

      const kbnClient: KbnClient = createKbnClient({
        kibanaUrl,
        elasticsearchUrl,
        auth,
        spaceId,
        log,
      });
      const esClient = createEsClient({
        kibanaUrl,
        elasticsearchUrl,
        auth,
        spaceId,
      });

      // Hard sanity checks (also ensures we always emit output even if ToolingLog is quiet)
      // eslint-disable-next-line no-console
      console.log(`[security_solution:data-generator] Kibana URL: ${kibanaUrl}`);
      // eslint-disable-next-line no-console
      console.log(`[security_solution:data-generator] Elasticsearch URL: ${elasticsearchUrl}`);
      await kbnClient.request({
        method: 'GET',
        path: '/api/status',
        headers: { 'kbn-xsrf': 'true' },
      });
      const esInfo = await esClient.info();
      // eslint-disable-next-line no-console
      console.log(
        `[security_solution:data-generator] Connected to ES cluster: ${esInfo.cluster_name} (${esInfo.version.number})`
      );

      try {
        await ensurePrebuiltRulesInstalled({
          kbnClient,
          log,
        });
      } catch (e) {
        // don’t block generation if the user doesn’t have Kibana privileges.
        // The script will still be able to index raw events, and may still preview rules
        // if the current user has detection privileges.
        log.warning(`Prebuilt rule install/status check failed; continuing. ${formatError(e)}`);
      }

      log.info(`Loading attack fixtures from: ${ATTACKS_DIR}`);
      log.info(`Loading noise fixtures from:  ${NOISE_DIR}`);
      log.info(
        `Target range: ${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()}`
      );
      log.info(`Scaling to: ${events} events, ${hosts} hosts, ${users} users`);

      try {
        const previewInterval = (() => {
          const rangeMs = endMs - startMs;
          // Cap executor invocations for speed; this is a *generator* not a perfect scheduler simulator.
          // Large windows (e.g. 60d) are extremely slow if we run many invocations per rule.
          const targetMs = Math.max(60 * 60 * 1000, Math.ceil(rangeMs / maxPreviewInvocations)); // at least 1h
          const hours = Math.max(1, Math.ceil(targetMs / (60 * 60 * 1000)));
          return `${hours}h`;
        })();
        const invocationCount = (() => {
          const rangeMs = endMs - startMs;
          const hours = Number(previewInterval.replace('h', ''));
          const intervalMs = hours * 60 * 60 * 1000;
          return Math.max(1, Math.ceil(rangeMs / intervalMs));
        })();
        log.info(
          `Rule preview tuning: interval=${previewInterval}, invocations=${invocationCount} (max=${maxPreviewInvocations})`
        );

        // Make the preview window wide enough that each invocation can find matches,
        // even if the underlying dataset is sparse within the time range.
        const previewWindowSeconds = Math.max(60, Math.ceil((endMs - startMs) / 1000));

        const effectiveSpaceId = spaceId && spaceId.length > 0 ? spaceId : 'default';

        const installedRules = await fetchAllInstalledRules({ kbnClient });
        const resolvedRules = (() => {
          const prebuilt = installedRules
            .filter((r) => r.immutable === true)
            .sort((a, b) => a.name.localeCompare(b.name) || a.rule_id.localeCompare(b.rule_id));

          const out: Array<{ id: string; rule_id: string; name: string }> = [];
          const seenNames = new Set<string>();
          for (const r of prebuilt) {
            if (out.length >= TARGET_PREBUILT_RULES_COUNT) break;
            if (!seenNames.has(r.name)) {
              seenNames.add(r.name);
              out.push({ id: r.id, rule_id: r.rule_id, name: r.name });
            }
          }
          return out;
        })();

        if (resolvedRules.length === 0) {
          log.warning(
            `No installed immutable (prebuilt) rules were found. Rule enable/attribution steps will be skipped.`
          );
        } else if (resolvedRules.length < TARGET_PREBUILT_RULES_COUNT) {
          log.warning(
            `Only resolved ${resolvedRules.length} unique prebuilt rule title(s) for enabling/attribution (target=${TARGET_PREBUILT_RULES_COUNT}).`
          );
        }

        if (clean) {
          const ruleIdsForClean = Array.from(new Set([...resolvedRules.map((r) => r.rule_id)]));

          await cleanGeneratedData({
            esClient,
            kbnClient,
            log,
            episodeIds,
            endMs,
            spaceId: effectiveSpaceId,
            startMs,
            username,
            ruleUuids: resolvedRules.map((r) => r.id),
            ruleIds: ruleIdsForClean,
            indexPrefix,
          });
        }

        const fileSets = listEpisodeFileSets(episodes);
        const loaded: EpisodeDocs[] = [];
        for (const fspec of fileSets) {
          log.info(`Loading ${fspec.episodeId} fixtures...`);
          loaded.push(await loadEpisode(fspec, { validateFixtures }));
        }

        await ensureGeneratorIndices({ esClient, endMs, episodeIds, log, indexPrefix });

        const scaled = scaleEpisodes(loaded, {
          startMs,
          endMs,
          targetEvents: events,
          hostCount: hosts,
          userCount: users,
          seed: getOptionalStringFlag(cliContext.flags, 'seed'),
          // Default behavior: concentrate most activity on a small subset of risky hosts/users.
          // This can be tuned later if needed, but is intentionally opinionated to look realistic.
          riskyHostCount: Math.min(2, hosts),
          riskyUserCount: Math.min(2, users),
          riskyProbability: 0.7,
        });

        await bulkIndexStreamed({
          esClient,
          endMs,
          episodeIds,
          log,
          docs: scaled,
          indexPrefix,
        });

        log.info(`Done indexing episode events/endpoint alerts (and insights-alerts copies).`);

        // In serverless, the Security alerts destination is typically a data stream and may not exist
        // until detections are initialized. Best-effort initialize here, then verify before preview/copy.
        await ensureDetectionsInitialized({ kbnClient, log });

        // Ensure rules are enabled so generated alerts always reference installed+enabled rules.
        await enableRules({ kbnClient, ids: resolvedRules.map((r) => r.id) });

        // Ensure preview index exists (some dev clusters don't allow it to be recreated automatically if deleted).
        await ensurePreviewAlertsIndex({ esClient, log, spaceId: effectiveSpaceId });
        await clearPreviewAlertsDocuments({ esClient, log, spaceId: effectiveSpaceId });

        if (skipAlerts) {
          log.warning(
            `--skip-alerts enabled: skipping rule preview, copying alerts, and optional Attack Discoveries/Cases. Raw data was still indexed.`
          );
          return;
        }

        const alertsReady = await alertsDataStreamExists({ esClient, spaceId: effectiveSpaceId });
        if (!alertsReady) {
          log.warning(
            `Security alerts destination (.alerts-security.alerts-${effectiveSpaceId}) does not exist yet. ` +
              `Initialize detections (Security app) and re-run to generate/copy alerts. Raw data was still indexed.`
          );
          return;
        }

        // Baseline: generate a small set of detection alerts using the Insights-style query,
        // then attribute them across ALL rules in the ruleset. This ensures the UI shows alerts
        // tied to each installed+enabled rule, even if some of those rules don't match the dataset.
        if (resolvedRules.length > 0) {
          const insightsRuleExportPath = path.join(ATTACKS_DIR, 'endpoint_alert.ndjson');
          const insightsRuleCreate = loadInsightsRuleCreateProps(insightsRuleExportPath);
          insightsRuleCreate.interval = previewInterval;
          insightsRuleCreate.from = `now-${previewWindowSeconds}s`;
          insightsRuleCreate.to = 'now';
          // Do not allow endpoint alert message to override rule name in generated detection alerts.
          delete insightsRuleCreate.rule_name_override;

          // PERFORMANCE:
          // Rule Preview is the slowest step. Instead of previewing the same Insights-style query
          // once per rule, run it ONCE and then copy/attribute the resulting preview alerts to each
          // ruleset rule (ids are namespaced during reindex to avoid collisions).
          const { previewId } = await previewRule({
            kbnClient,
            log,
            req: {
              rule: insightsRuleCreate,
              invocationCount,
              timeframeEndIso: new Date(endMs).toISOString(),
            },
          });

          for (const ruleRef of resolvedRules) {
            const fullRule = await fetchRuleById({ kbnClient, id: ruleRef.id });
            const riskScore =
              typeof fullRule.risk_score === 'number' ? fullRule.risk_score : undefined;
            await copyPreviewAlertsToRealAlertsIndex({
              esClient,
              log,
              spaceId: effectiveSpaceId,
              previewId,
              targetRule: { ...ruleRef, risk_score: riskScore },
              timestampRange: { startMs, endMs },
            });
          }
        }

        if (!skipRulesetPreview) {
          for (const ruleRef of resolvedRules) {
            log.info(`Previewing prebuilt rule: ${ruleRef.name} (${ruleRef.rule_id})`);
            const fullRule = await fetchRuleById({ kbnClient, id: ruleRef.id });
            const createProps = toRuleCreateProps(fullRule);
            createProps.interval = previewInterval;
            createProps.from = `now-${previewWindowSeconds}s`;
            createProps.to = 'now';

            const { previewId: rulesetPreviewId } = await previewRule({
              kbnClient,
              log,
              req: {
                rule: createProps,
                invocationCount,
                timeframeEndIso: new Date(endMs).toISOString(),
              },
            });

            await copyPreviewAlertsToRealAlertsIndex({
              esClient,
              log,
              spaceId: effectiveSpaceId,
              previewId: rulesetPreviewId,
              targetRule: ruleRef,
              timestampRange: { startMs, endMs },
            });
          }
        } else {
          log.warning(
            `--skip-ruleset-preview enabled: skipping ruleset rule previews (baseline attribution only).`
          );
        }

        log.info(`Done generating/copying canonical Security alerts for prebuilt rules.`);

        if (shouldGenerateAttackDiscoveries) {
          const discoveries = await generateAndIndexAttackDiscoveries({
            esClient,
            kbnClient,
            log,
            spaceId: effectiveSpaceId,
            alertsIndex: `.alerts-security.alerts-${effectiveSpaceId}`,
            authenticatedUsername: username,
            opts: { startMs, endMs },
          });

          log.info(`Done generating synthetic Attack Discoveries.`);

          if (shouldCreateCases) {
            await createCasesFromAttackDiscoveries({
              kbnClient,
              log,
              discoveries,
              alertsIndex: `.alerts-security.alerts-${effectiveSpaceId}`,
            });
            log.info(`Done creating cases for a subset of Attack Discoveries.`);
          }
        } else {
          log.info(`Skipping Attack Discoveries (enable with --attacks, or use --cases).`);
        }
      } catch (e) {
        log.warning(
          `Alert generation via Kibana APIs failed; raw data was still indexed. Error: ${formatError(
            e
          )}`
        );
      }
    },
    {
      description:
        'Generate realistic Security data from vendored attack episodes, then produce Security alerts + Attack Discoveries',
      flags: {
        string: [
          'events',
          'hosts',
          'users',
          'kibanaUrl',
          'elasticsearchUrl',
          'username',
          'password',
          'apiKey',
          'spaceId',
          'episodes',
          'seed',
          'start-date',
          'end-date',
          'indexPrefix',
          'max-preview-invocations',
        ],
        boolean: [
          'clean',
          'skip-alerts',
          'skip-ruleset-preview',
          'attacks',
          'cases',
          'validate-fixtures',
        ],
        alias: {
          n: 'events',
          h: 'hosts',
          u: 'users',
        },
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
          events: '100',
          hosts: '5',
          users: '5',
          'start-date': '1d',
          'end-date': 'now',
          indexPrefix: 'logs-endpoint',
          'max-preview-invocations': '12',
          clean: false,
          'skip-alerts': false,
          'skip-ruleset-preview': false,
          attacks: false,
          cases: false,
          'validate-fixtures': true,
        },
        allowUnexpected: false,
        help: `
        -n, --events                     Number of source events to generate (Default: 100)
        -h, --hosts                      Number of hosts to spread events across (Default: 5)
        -u, --users                      Number of users to spread events across (Default: 5)
        --start-date                     Date math start (e.g. 1d, now-1d) (Default: 1d)
        --end-date                       Date math end (e.g. now) (Default: now)
        --episodes                       Comma-separated episode IDs or numbers (e.g. ep1,ep2 or 1,2). Default: ep1-ep8,noise1,noise2
        --seed                           Optional seed for deterministic scaling
        --clean                          Delete previously generated data for the selected time range before generating new data
        --indexPrefix                    Prefix for endpoint event/alert indices (Default: logs-endpoint)
        --max-preview-invocations         Max rule preview invocations per rule (Default: 12). Lower = faster for large time ranges.
        --skip-alerts                     Skip rule preview + copying alerts entirely (raw event/endpoint alert indexing only)
        --skip-ruleset-preview            Skip previews of the selected prebuilt rules (baseline attribution only; faster)
        --attacks                         Generate synthetic Attack Discoveries (opt-in)
        --cases                          Create cases from ~50% of generated Attack Discoveries (implies --attacks)
        --no-validate-fixtures            Disable fixture validation (default: validation enabled)

        --username                       Kibana/Elasticsearch username (Default: elastic)
        --password                       Kibana/Elasticsearch password (Default: changeme)
        --apiKey                         Elasticsearch API key (base64, with or without "ApiKey " prefix). Enables API key auth for both Kibana and Elasticsearch. You can also set ES_API_KEY.
        --kibanaUrl                       Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl                Elasticsearch URL (Default: http://127.0.0.1:9200)
        --spaceId                         Kibana space id (optional)
      `,
      },
    }
  );
};

cli();
