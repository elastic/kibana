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
import { fetchRuleById, resolveRuleset, toRuleCreateProps } from './lib/ruleset';
import { generateAndIndexAttackDiscoveries } from './lib/attack_discoveries';

const EPISODES_DIR = scriptsDataDir('episodes', 'attacks');
const MAPPING_PATH = path.join(EPISODES_DIR, 'mapping.json');

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

const listEpisodeFileSets = (episodesDir: string, selected: Set<string>): EpisodeFileSet[] => {
  const files = fs.readdirSync(episodesDir);

  const fileSets: EpisodeFileSet[] = [];
  for (const epId of [...selected].sort()) {
    const data = files.find((f) => f === `${epId}data.ndjson.gz`);
    const alerts = files.find((f) => f === `${epId}alerts.ndjson.gz`);
    if (!data || !alerts) {
      throw new Error(
        `Episode ${epId} is missing files. Expected ${epId}data.ndjson.gz and ${epId}alerts.ndjson.gz in ${episodesDir}`
      );
    }
    fileSets.push({
      episodeId: epId,
      dataPath: path.join(episodesDir, data),
      alertsPath: path.join(episodesDir, alerts),
    });
  }
  return fileSets;
};

const parseEpisodesFlag = (value: string | undefined): Set<string> => {
  if (!value) return new Set(['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8']);
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('ep') ? p : `ep${p}`));
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
  docs: AsyncGenerator<{ episodeId: string; kind: 'data' | 'endpoint_alert' | 'insights_alert'; doc: any }>;
}) => {
  const buffers = new Map<string, Array<Record<string, unknown>>>();
  const flush = async (index: string) => {
    const batch = buffers.get(index) ?? [];
    if (batch.length === 0) return;
    buffers.set(index, []);
    const body = batch.flatMap((doc) => [{ index: { _index: index } }, doc]);
    const resp = await esClient.bulk({ refresh: false, body });
    if (resp.errors) {
      throw new Error(`Bulk indexing errors for ${index}`);
    }
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
};

export const cli = () => {
  run(
    async (cliContext) => {
      const log = cliContext.log;

      const nowMs = Date.now();
      const startMs = parseDateMathOrThrow(cliContext.flags['start-date'] as string, nowMs);
      const endMs = parseDateMathOrThrow(cliContext.flags['end-date'] as string, nowMs);

      const events = Number(cliContext.flags.n ?? cliContext.flags.events ?? 10_000);
      const hosts = Number(cliContext.flags.h ?? cliContext.flags.hosts ?? 100);
      const users = Number(cliContext.flags.u ?? cliContext.flags.users ?? 100);

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

      await ensurePrebuiltRulesInstalledBestEffort({ kbnClient, log });

      log.info(`Loading episode fixtures from: ${EPISODES_DIR}`);
      log.info(`Target range: ${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()}`);
      log.info(`Scaling to: ${events} events, ${hosts} hosts, ${users} users`);

      const fileSets = listEpisodeFileSets(EPISODES_DIR, episodes);
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
      });

      await bulkIndexStreamed({
        esClient,
        endMs,
        episodeIds,
        log,
        docs: scaled as any,
      });

      log.info(`Done indexing episode events/endpoint alerts (and insights-alerts copies).`);

      // Preview (and then copy) canonical Security alerts for Insights rule as a baseline.
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

      const insightsRuleExportPath = path.join(EPISODES_DIR, 'endpoint_alert.ndjson');
      const insightsRuleCreate = loadInsightsRuleCreateProps(insightsRuleExportPath);
      insightsRuleCreate.interval = previewInterval;

      const { previewId } = await previewRule({
        kbnClient,
        log,
        req: {
          rule: insightsRuleCreate,
          invocationCount,
          timeframeEndIso: new Date(endMs).toISOString(),
        },
      });

      const effectiveSpaceId = spaceId ?? 'default';
      await copyPreviewAlertsToRealAlertsIndex({
        esClient,
        log,
        spaceId: effectiveSpaceId,
        previewId,
      });

      log.info(`Done generating/copying canonical Security alerts for Insights.`);

      const rulesetPath = cliContext.flags.ruleset as string;
      const resolvedRules = await resolveRuleset({
        kbnClient,
        log,
        rulesetPath,
        strict: false,
      });

      for (const ruleRef of resolvedRules) {
        log.info(`Previewing ruleset rule: ${ruleRef.name} (${ruleRef.rule_id})`);
        const fullRule = await fetchRuleById({ kbnClient, id: ruleRef.id });
        const createProps = toRuleCreateProps(fullRule);
        createProps.interval = previewInterval;

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
        });
      }

      log.info(`Done generating/copying canonical Security alerts for ruleset.`);

      await generateAndIndexAttackDiscoveries({
        esClient,
        log,
        spaceId: effectiveSpaceId,
        alertsIndex: `.alerts-security.alerts-${effectiveSpaceId}`,
        opts: { startMs, endMs },
      });

      log.info(`Done generating synthetic Attack Discoveries.`);
    },
    {
      description:
        'Generate realistic Security data from vendored attack episodes, then produce Security alerts + Attack Discoveries',
      flags: {
        string: [
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
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          'start-date': '60d',
          'end-date': 'now',
          ruleset: scriptsDataDir('rulesets', 'default_ruleset.yml'),
        },
        allowUnexpected: false,
        help: `
        -n, --events                     Number of source events to generate (Default: 10000)
        -h, --hosts                      Number of hosts to spread events across (Default: 100)
        -u, --users                      Number of users to spread events across (Default: 100)
        --start-date                     Date math start (e.g. 60d, now-60d) (Default: 60d)
        --end-date                       Date math end (e.g. now) (Default: now)
        --episodes                       Comma-separated episode IDs or numbers (e.g. ep1,ep2 or 1,2). Default: ep1-ep8
        --seed                           Optional seed for deterministic scaling
        --ruleset                        Path to ruleset file (Default: x-pack/solutions/security/plugins/security_solution/scripts/data/rulesets/default_ruleset.yml)

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

