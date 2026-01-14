/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import datemath from '@kbn/datemath';
import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';

import { createEsClient, createKbnClient } from './lib/clients';
import type { EpisodeDocs, EpisodeFileSet } from './lib/episodes';
import { loadEpisode, scaleEpisodes } from './lib/episodes';
import { ensureIndex, episodeIndexNames, scriptsDataDir } from './lib/indexing';
import { ensurePrebuiltRulesInstalledBestEffort } from './lib/prebuilt_rules';
import { loadInsightsRuleCreateProps } from './lib/insights_rule';
import { copyPreviewAlertsToRealAlertsIndex, previewRule } from './lib/rule_preview';
import { enableRules, fetchRuleById, resolveRuleset, toRuleCreateProps } from './lib/ruleset';
import { generateAndIndexAttackDiscoveries } from './lib/attack_discoveries';

const ATTACKS_DIR = scriptsDataDir('episodes', 'attacks');
const NOISE_DIR = scriptsDataDir('episodes', 'noise');
const MAPPING_PATH = path.join(ATTACKS_DIR, 'mapping.json');

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

const ensureGeneratorIndices = async ({
  esClient,
  endMs,
  episodeIds,
  log,
}: {
  esClient: Client;
  endMs: number;
  episodeIds: string[];
  log: ToolingLog;
}) => {
  for (const ep of episodeIds) {
    const idx = episodeIndexNames({ episodeId: ep, endMs });
    await ensureIndex({ esClient, index: idx.endpointEvents, mappingPath: MAPPING_PATH, log });
    await ensureIndex({ esClient, index: idx.endpointAlerts, mappingPath: MAPPING_PATH, log });
    await ensureIndex({ esClient, index: idx.insightsAlerts, mappingPath: MAPPING_PATH, log });
  }
};

const cleanGeneratedDataBestEffort = async ({
  esClient,
  log,
  episodeIds,
  endMs,
  spaceId,
  startMs,
  username,
  ruleUuids,
}: {
  esClient: Client;
  log: ToolingLog;
  episodeIds: string[];
  endMs: number;
  spaceId: string;
  startMs: number;
  username: string;
  ruleUuids: string[];
}) => {
  log.warning(
    `--clean enabled: deleting generated episode indices and generated alerts/discoveries in space "${spaceId}" within the requested time range`
  );

  // 1) Remove the exact episode indices created for this run's episodeIds + date suffix.
  const episodeIndices = episodeIds.flatMap((ep) => {
    const idx = episodeIndexNames({ episodeId: ep, endMs });
    return [idx.endpointEvents, idx.endpointAlerts, idx.insightsAlerts];
  });

  try {
    await esClient.indices.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      index: episodeIndices as any,
      ignore_unavailable: true,
    });
  } catch (e) {
    log.warning(
      `--clean: failed to delete episode indices (best-effort): ${String(
        (e as Error).message ?? e
      )}`
    );
  }

  // 2) Remove previously generated Security alerts (copied from preview) for the selected rules + time range.
  const alertsIndex = `.alerts-security.alerts-${spaceId}`;
  if (ruleUuids.length > 0) {
    try {
      const exists = await esClient.indices.exists({ index: alertsIndex });
      if (exists) {
        await esClient.deleteByQuery({
          index: alertsIndex,
          conflicts: 'proceed',
          refresh: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: new Date(startMs).toISOString(),
                        lte: new Date(endMs).toISOString(),
                      },
                    },
                  },
                  { terms: { 'kibana.alert.rule.uuid': ruleUuids } },
                ],
              },
            },
          },
        });
      }
    } catch (e) {
      log.warning(
        `--clean: failed to delete Security alerts from ${alertsIndex} (best-effort): ${String(
          (e as Error).message ?? e
        )}`
      );
    }
  }

  // 3) Remove previously generated ad-hoc Attack Discoveries (synthetic/no-LLM) for this user + time range.
  const adhocDiscoveryAlias = `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`;
  try {
    const exists = await esClient.indices.exists({ index: adhocDiscoveryAlias });
    if (exists) {
      await esClient.deleteByQuery({
        index: adhocDiscoveryAlias,
        conflicts: 'proceed',
        refresh: true,
        body: {
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: new Date(startMs).toISOString(),
                      lte: new Date(endMs).toISOString(),
                    },
                  },
                },
                { term: { 'kibana.alert.attack_discovery.api_config.name': 'Synthetic (no-LLM)' } },
                { term: { 'kibana.alert.attack_discovery.user.name': username } },
              ],
            },
          },
        },
      });
    }
  } catch (e) {
    log.warning(
      `--clean: failed to delete Attack Discoveries from ${adhocDiscoveryAlias} (best-effort): ${String(
        (e as Error).message ?? e
      )}`
    );
  }

  // NOTE: Do NOT delete preview indices here.
  // The Rule Preview API may not recreate them automatically in all dev setups, which can lead
  // to "no preview alerts were written" on subsequent runs.
};

const ensurePreviewAlertsIndexBestEffort = async ({
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
  const realAlertsBackingIndex = `.internal.alerts-security.alerts-${spaceId}-000001`;
  const realExists = await esClient.indices.exists({ index: realAlertsBackingIndex });
  if (!realExists) {
    log.warning(
      `Preview alerts index ${previewAlias} is missing, but cannot recreate it because ${realAlertsBackingIndex} is missing.`
    );
    return;
  }

  try {
    const mappingResp = await esClient.indices.getMapping({ index: realAlertsBackingIndex });
    const mapping = (mappingResp as any)?.[realAlertsBackingIndex]?.mappings;

    log.info(`Recreating missing preview alerts backing index: ${previewBackingIndex}`);
    await esClient.indices.create({
      index: previewBackingIndex,
      settings: {
        index: {
          hidden: true,
        },
      },
      mappings: mapping,
      aliases: {
        [previewAlias]: {},
        [previewInternalAlias]: {},
      },
    });
  } catch (e) {
    log.warning(
      `Failed to recreate preview alerts index ${previewAlias} (best-effort): ${String(
        (e as Error).message ?? e
      )}`
    );
  }
};

const bulkIndexStreamed = async ({
  esClient,
  endMs,
  episodeIds,
  log,
  docs,
}: {
  esClient: Client;
  endMs: number;
  episodeIds: string[];
  log: ToolingLog;
  docs: AsyncGenerator<{
    episodeId: string;
    kind: 'data' | 'endpoint_alert' | 'insights_alert';
    doc: any;
  }>;
}) => {
  const buffers = new Map<string, Array<Record<string, unknown>>>();
  const indexedCounts = new Map<string, number>();
  const flush = async (index: string) => {
    const batch = buffers.get(index) ?? [];
    if (batch.length === 0) return;
    buffers.set(index, []);
    const body = batch.flatMap((doc) => [{ index: { _index: index } }, doc]);
    const resp = await esClient.bulk({ refresh: false, body });
    if (resp.errors) {
      throw new Error(`Bulk indexing errors for ${index}`);
    }
    indexedCounts.set(index, (indexedCounts.get(index) ?? 0) + batch.length);
  };

  const ensureBuf = (index: string) => {
    if (!buffers.has(index)) buffers.set(index, []);
    return buffers.get(index)!;
  };

  for await (const item of docs) {
    if (!episodeIds.includes(item.episodeId)) continue;
    const idx = episodeIndexNames({ episodeId: item.episodeId, endMs });
    const index =
      item.kind === 'data'
        ? idx.endpointEvents
        : item.kind === 'endpoint_alert'
        ? idx.endpointAlerts
        : idx.insightsAlerts;

    const buf = ensureBuf(index);
    buf.push(item.doc as Record<string, unknown>);
    if (buf.length >= 1000) await flush(index);
  }

  for (const index of buffers.keys()) {
    await flush(index);
  }

  for (const [index, count] of [...indexedCounts.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    log.info(`Indexed ${count} docs into ${index}`);
  }
};

export const cli = () => {
  run(
    async (cliContext) => {
      const log = cliContext.log;

      const nowMs = Date.now();
      const startMs = parseDateMathOrThrow(cliContext.flags['start-date'] as string, nowMs);
      const endMs = parseDateMathOrThrow(cliContext.flags['end-date'] as string, nowMs);

      const events = Number(cliContext.flags.n ?? cliContext.flags.events ?? 100);
      const hosts = Number(cliContext.flags.h ?? cliContext.flags.hosts ?? 5);
      const users = Number(cliContext.flags.u ?? cliContext.flags.users ?? 5);
      const clean = Boolean(cliContext.flags.clean);

      const episodes = parseEpisodesFlag(cliContext.flags.episodes as string | undefined);
      const episodeIds = [...episodes].sort();

      const kibanaUrl = cliContext.flags.kibanaUrl as string;
      const elasticsearchUrl = cliContext.flags.elasticsearchUrl as string;
      const username = cliContext.flags.username as string;
      const password = cliContext.flags.password as string;
      const spaceId = cliContext.flags.spaceId as string | undefined;

      const kbnClient: KbnClient = createKbnClient({
        kibanaUrl,
        elasticsearchUrl,
        username,
        password,
        spaceId,
        log,
      });
      const esClient = createEsClient({
        kibanaUrl,
        elasticsearchUrl,
        username,
        password,
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
        await ensurePrebuiltRulesInstalledBestEffort({
          kbnClient,
          log,
          rulesetPath: cliContext.flags.ruleset as string,
        });
      } catch (e) {
        // Best-effort: don’t block generation if the user doesn’t have Kibana privileges.
        // The script will still be able to index raw events, and may still preview rules
        // if the current user has detection privileges.
        log.warning(
          `Prebuilt rule install/status check failed; continuing. ${String(
            (e as Error).message ?? e
          )}`
        );
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
          // cap executor invocations for speed; this is a *generator* not a perfect scheduler simulator
          const maxInvocations = 120;
          const targetMs = Math.max(60 * 60 * 1000, Math.ceil(rangeMs / maxInvocations)); // at least 1h
          const hours = Math.max(1, Math.round(targetMs / (60 * 60 * 1000)));
          return `${hours}h`;
        })();
        const invocationCount = (() => {
          const rangeMs = endMs - startMs;
          const hours = Number(previewInterval.replace('h', ''));
          const intervalMs = hours * 60 * 60 * 1000;
          return Math.max(1, Math.ceil(rangeMs / intervalMs));
        })();

        // Make the preview window wide enough that each invocation can find matches,
        // even if the underlying dataset is sparse within the time range.
        const previewWindowSeconds = Math.max(60, Math.ceil((endMs - startMs) / 1000));

        const effectiveSpaceId = spaceId && spaceId.length > 0 ? spaceId : 'default';

        const rulesetPath = cliContext.flags.ruleset as string;
        const resolvedRules = await resolveRuleset({
          kbnClient,
          log,
          rulesetPath,
          strict: false,
        });

        if (clean) {
          await cleanGeneratedDataBestEffort({
            esClient,
            log,
            episodeIds,
            endMs,
            spaceId: effectiveSpaceId,
            startMs,
            username,
            ruleUuids: resolvedRules.map((r) => r.id),
          });
        }

        const fileSets = listEpisodeFileSets(episodes);
        const loaded: EpisodeDocs[] = [];
        for (const fspec of fileSets) {
          log.info(`Loading ${fspec.episodeId} fixtures...`);
          loaded.push(await loadEpisode(fspec));
        }

        await ensureGeneratorIndices({ esClient, endMs, episodeIds, log });

        const scaled = scaleEpisodes(loaded, {
          startMs,
          endMs,
          targetEvents: events,
          hostCount: hosts,
          userCount: users,
          seed: cliContext.flags.seed as string | undefined,
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
          docs: scaled as any,
        });

        log.info(`Done indexing episode events/endpoint alerts (and insights-alerts copies).`);

        // Ensure rules are enabled so generated alerts always reference installed+enabled rules.
        await enableRules({ kbnClient, ids: resolvedRules.map((r) => r.id) });

        // Ensure preview index exists (some dev clusters don't allow it to be recreated automatically if deleted).
        await ensurePreviewAlertsIndexBestEffort({ esClient, log, spaceId: effectiveSpaceId });

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
          delete (insightsRuleCreate as any).rule_name_override;

          for (const ruleRef of resolvedRules) {
            const { previewId } = await previewRule({
              kbnClient,
              log,
              req: {
                rule: insightsRuleCreate,
                invocationCount,
                timeframeEndIso: new Date(endMs).toISOString(),
              },
            });

            await copyPreviewAlertsToRealAlertsIndex({
              esClient,
              log,
              spaceId: effectiveSpaceId,
              previewId,
              targetRule: ruleRef,
              timestampRange: { startMs, endMs },
            });
          }
        }

        for (const ruleRef of resolvedRules) {
          log.info(`Previewing ruleset rule: ${ruleRef.name} (${ruleRef.rule_id})`);
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

        log.info(`Done generating/copying canonical Security alerts for ruleset.`);

        await generateAndIndexAttackDiscoveries({
          esClient,
          log,
          spaceId: effectiveSpaceId,
          alertsIndex: `.alerts-security.alerts-${effectiveSpaceId}`,
          authenticatedUsername: username,
          opts: { startMs, endMs },
        });

        log.info(`Done generating synthetic Attack Discoveries.`);
      } catch (e) {
        log.warning(
          `Alert generation via Kibana APIs failed; raw data was still indexed. Error: ${String(
            (e as Error).message ?? e
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
          'spaceId',
          'episodes',
          'seed',
          'start-date',
          'end-date',
          'ruleset',
        ],
        boolean: ['clean'],
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
          events: '100',
          hosts: '5',
          users: '5',
          'start-date': '1d',
          'end-date': 'now',
          ruleset: scriptsDataDir('rulesets', 'default_ruleset.yml'),
          clean: false,
        },
        allowUnexpected: false,
        help: `
        -n, --events                     Number of source events to generate (Default: 100)
        -h, --hosts                      Number of hosts to spread events across (Default: 5)
        -u, --users                      Number of users to spread events across (Default: 5)
        --start-date                     Date math start (e.g. 1d, now-1d) (Default: 1d)
        --end-date                       Date math end (e.g. now) (Default: now)
        --episodes                       Comma-separated episode IDs or numbers (e.g. ep1,ep2 or 1,2). Default: ep1-ep8
        --seed                           Optional seed for deterministic scaling
        --ruleset                        Path to ruleset file (Default: x-pack/solutions/security/plugins/security_solution/scripts/data/rulesets/default_ruleset.yml)
        --clean                          Delete previously generated data for the selected time range before generating new data

        --username                       Kibana/Elasticsearch username (Default: elastic)
        --password                       Kibana/Elasticsearch password (Default: changeme)
        --kibanaUrl                       Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl                Elasticsearch URL (Default: http://127.0.0.1:9200)
        --spaceId                         Kibana space id (optional)
      `,
      },
    }
  );
};

cli();
