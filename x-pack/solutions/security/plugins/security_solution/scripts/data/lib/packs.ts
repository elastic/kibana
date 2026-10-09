/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { getPack, listPacks, type Hunt, type TechnologyWatchPack } from '../packs';
import { readNdjson } from './episodes';
import { enrichDocForGraph } from './graph_enrichment';
import { huntRuleId, legacyHuntRuleId } from './hunt_ids';
import { bulkIndex, dateSuffix, ensureIndex, scriptsDataDir } from './indexing';
import {
  createCustomRule,
  deleteRules,
  disableRules,
  enableRules,
  fetchAllInstalledRules,
  findGeneratorPackRules,
} from './ruleset';
import { isString } from './type_guards';

export { huntRuleId, legacyHuntRuleId, HUNT_RULE_ID_NAMESPACE } from './hunt_ids';

export const PACK_TAG_PREFIX = 'pack:';
export const DATA_GENERATOR_TAG = 'data-generator';
export const DATA_GENERATOR_FP_TAG = 'data-generator-fp';

const PACK_MAPPING_PATH = scriptsDataDir('packs', 'mapping.json');

export const packTag = (packId: string): string => `${PACK_TAG_PREFIX}${packId}`;

/** Merge ownership tags onto a source doc (required for --clean and FP evals). */
export const stampOwnershipTags = (
  doc: Record<string, unknown>,
  {
    packId,
    isFalsePositive = false,
  }: {
    packId?: string;
    isFalsePositive?: boolean;
  } = {}
): void => {
  const existing = Array.isArray(doc.tags) ? doc.tags.filter(isString) : [];
  const next = new Set(existing);
  next.add(DATA_GENERATOR_TAG);
  if (packId) next.add(packTag(packId));
  if (isFalsePositive) next.add(DATA_GENERATOR_FP_TAG);
  doc.tags = [...next];
};

/**
 * Ensure ECS `source.ip` is present when pack events only stamp
 * `related.ip` / `kubernetes.audit.sourceIPs` (common for kubernetes.audit).
 * Mustard hunt + atomic ES|QL both match `source.ip` first.
 */
export const ensureEcsSourceIp = (doc: Record<string, unknown>): void => {
  const source =
    doc.source && typeof doc.source === 'object' && !Array.isArray(doc.source)
      ? (doc.source as Record<string, unknown>)
      : undefined;
  if (source && isString(source.ip) && source.ip.length > 0) return;

  const related =
    doc.related && typeof doc.related === 'object' && !Array.isArray(doc.related)
      ? (doc.related as Record<string, unknown>)
      : undefined;
  const relatedIps = Array.isArray(related?.ip) ? related.ip.filter(isString) : [];
  if (relatedIps[0]) {
    doc.source = { ...(source ?? {}), ip: relatedIps[0] };
    return;
  }

  const kubernetes =
    doc.kubernetes && typeof doc.kubernetes === 'object' && !Array.isArray(doc.kubernetes)
      ? (doc.kubernetes as Record<string, unknown>)
      : undefined;
  const audit =
    kubernetes?.audit && typeof kubernetes.audit === 'object' && !Array.isArray(kubernetes.audit)
      ? (kubernetes.audit as Record<string, unknown>)
      : undefined;
  const auditIps = Array.isArray(audit?.sourceIPs) ? audit.sourceIPs.filter(isString) : [];
  if (auditIps[0]) {
    doc.source = { ...(source ?? {}), ip: auditIps[0] };
  }
};

/** Tags for installed pack hunt rules (cleanup + provenance). */
export const packRuleTags = (pack: TechnologyWatchPack): string[] => [
  DATA_GENERATOR_TAG,
  packTag(pack.id),
  pack.technology,
];

export const packIndexName = ({
  packId: _packId,
  dataStream,
  endMs,
  dateSuffixOverride,
}: {
  packId: string;
  dataStream: string;
  endMs: number;
  dateSuffixOverride?: string;
}): string => {
  const suffix = dateSuffixOverride ?? dateSuffix(endMs);
  // Prefer integration dataset naming (no "generator" token). Dot segments avoid logs-*-*
  // data-stream-only templates (those need a second hyphen after logs-).
  const safeDs = dataStream.replace(/[^a-zA-Z0-9.]+/g, '_');
  return `logs-${safeDs}.${suffix}`;
};

/** Legacy index names from older generator runs (for --clean only). */
export const legacyPackIndexName = ({
  packId,
  dataStream,
  endMs,
  dateSuffixOverride,
}: {
  packId: string;
  dataStream: string;
  endMs: number;
  dateSuffixOverride?: string;
}): string => {
  const suffix = dateSuffixOverride ?? dateSuffix(endMs);
  const safePack = packId.replace(/[^a-zA-Z0-9]+/g, '_');
  const safeDs = dataStream.replace(/[^a-zA-Z0-9.]+/g, '_');
  return `logs-generator.${safePack}.${safeDs}.${suffix}`;
};

export const parsePacksFlag = (value: string | undefined): string[] => {
  if (!value || value.trim().length === 0) return [];
  const ids = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const unknown = ids.filter((id) => !getPack(id));
  if (unknown.length > 0) {
    const available = listPacks()
      .map((p) => p.id)
      .join(', ');
    throw new Error(`Unknown --packs id(s): ${unknown.join(', ')}. Available: ${available}`);
  }
  return [...new Set(ids)];
};

const shiftIso = (iso: string, deltaMs: number): string => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms + deltaMs).toISOString();
};

const timeShiftDocs = (
  docs: Array<Record<string, unknown>>,
  startMs: number,
  endMs: number
): Array<Record<string, unknown>> => {
  if (docs.length === 0) return [];
  const stamps = docs
    .map((d) => Date.parse(String(d['@timestamp'] ?? '')))
    .filter((ms) => Number.isFinite(ms));
  const minTs = stamps.length > 0 ? Math.min(...stamps) : startMs;
  const maxTs = stamps.length > 0 ? Math.max(...stamps) : endMs;
  const span = Math.max(1, maxTs - minTs);
  const range = Math.max(1, endMs - startMs);

  return docs.map((doc, idx) => {
    const cloned: Record<string, unknown> = structuredClone(doc);
    const raw = Date.parse(String(cloned['@timestamp'] ?? ''));
    const ratio = Number.isFinite(raw) ? (raw - minTs) / span : idx / Math.max(1, docs.length - 1);
    const target = startMs + Math.floor(ratio * (range - 1));
    const delta = target - (Number.isFinite(raw) ? raw : minTs);
    if (typeof cloned['@timestamp'] === 'string') {
      cloned['@timestamp'] = shiftIso(cloned['@timestamp'], delta);
    } else {
      cloned['@timestamp'] = new Date(target).toISOString();
    }
    return cloned;
  });
};

const loadPackEvents = async (
  pack: TechnologyWatchPack
): Promise<Array<Record<string, unknown>>> => {
  const eventsPath = path.join(scriptsDataDir('packs', pack.id), 'events.ndjson');
  return readNdjson(eventsPath);
};

const buildMitreThreat = (mitre: Hunt['mitre']): Array<Record<string, unknown>> => {
  return mitre.map((m) => {
    const techniqueId = m.technique;
    const isSub = techniqueId.includes('.');
    const parentId = isSub ? techniqueId.split('.')[0] : techniqueId;
    const techniqueName = m.techniqueName ?? techniqueId;
    const tacticName = m.tacticName ?? m.tactic;
    const techniqueRef = isSub
      ? `https://attack.mitre.org/techniques/${parentId}/${techniqueId.split('.')[1]}/`
      : `https://attack.mitre.org/techniques/${techniqueId}/`;

    return {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: m.tactic,
        name: tacticName,
        reference: `https://attack.mitre.org/tactics/${m.tactic}/`,
      },
      technique: [
        {
          id: techniqueId,
          name: techniqueName,
          reference: techniqueRef,
        },
      ],
    };
  });
};

export const huntDescription = (pack: TechnologyWatchPack, hunt: Hunt): string => {
  return `Detects suspicious ${pack.technology} activity: ${hunt.name}.`;
};

export interface IndexedPackResult {
  pack: TechnologyWatchPack;
  index: string;
  eventCount: number;
  fpEventCount: number;
  installedRules: Array<{ id: string; rule_id: string; name: string }>;
}

export const indexAndInstallPack = async ({
  packId,
  esClient,
  kbnClient,
  log,
  startMs,
  endMs,
  fpCount,
  installRules = true,
  enableRules: shouldEnable = false,
  ruleFrom,
}: {
  packId: string;
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  startMs: number;
  endMs: number;
  fpCount: number;
  /** When false (alert-mode=none), index events only and skip hunt install. */
  installRules?: boolean;
  enableRules?: boolean;
  ruleFrom?: string;
}): Promise<IndexedPackResult> => {
  const pack = getPack(packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);

  const source = pack.eventSources[0];
  if (!source) throw new Error(`Pack ${packId} has no eventSources`);

  log.info(
    `Pack ${packId}: fidelity=${source.fidelity} integration=${source.integration}@${source.version} dataStream=${source.dataStream}`
  );

  const index = packIndexName({ packId, dataStream: source.dataStream, endMs });
  await ensureIndex({ esClient, index, mappingPath: PACK_MAPPING_PATH, log });

  const rawEvents = await loadPackEvents(pack);
  const events = timeShiftDocs(rawEvents, startMs, endMs).map((doc) => {
    stampOwnershipTags(doc, { packId });
    ensureEcsSourceIp(doc);
    enrichDocForGraph(doc);
    return doc;
  });

  let fpEvents: Array<Record<string, unknown>> = [];
  if (fpCount > 0) {
    for (const hunt of pack.hunts) {
      const templates = hunt.falsePositives ?? [];
      for (let i = 0; i < Math.min(fpCount, templates.length); i++) {
        const tpl = structuredClone(templates[i]);
        stampOwnershipTags(tpl, { packId, isFalsePositive: true });
        ensureEcsSourceIp(tpl);
        enrichDocForGraph(tpl);
        fpEvents.push(tpl);
      }
    }
    fpEvents = timeShiftDocs(fpEvents, startMs, endMs);
  }

  const allDocs = [...events, ...fpEvents];
  await bulkIndex({ esClient, index, docs: allDocs, log });
  await esClient.indices.refresh({ index });
  log.info(
    `Pack ${packId}: indexed ${events.length} events + ${fpEvents.length} FP events → ${index}`
  );

  const installedRules: IndexedPackResult['installedRules'] = [];
  if (!installRules) {
    log.info(`Pack ${packId}: skipped hunt install (alert-mode=none)`);
    return {
      pack,
      index,
      eventCount: events.length,
      fpEventCount: fpEvents.length,
      installedRules,
    };
  }

  for (const hunt of pack.hunts) {
    const ruleId = huntRuleId(packId, hunt.name);
    const existing = (await fetchAllInstalledRules({ kbnClient })).find(
      (r) => r.rule_id === ruleId
    );
    if (existing) {
      // Refresh the full hunt definition (not just index/lookback). Otherwise an
      // edited query / MITRE / severity with the same hunt name would leave a
      // stale rule on re-run without --clean, breaking honest attribution.
      const ruleType =
        hunt.ruleType === 'eql' || hunt.ruleType === 'esql' ? hunt.ruleType : 'query';
      const language =
        hunt.language === 'esql' ? 'esql' : hunt.language === 'eql' ? 'eql' : 'kuery';
      await kbnClient.request({
        method: 'PATCH',
        path: `/api/detection_engine/rules`,
        headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
        body: {
          id: existing.id,
          name: hunt.name,
          description: huntDescription(pack, hunt),
          index: [index],
          from: ruleFrom ?? 'now-30d',
          to: 'now',
          interval: '5m',
          tags: packRuleTags(pack),
          enabled: false,
          type: ruleType,
          language,
          query: hunt.query,
          severity: 'medium',
          risk_score: 47,
          threat: buildMitreThreat(hunt.mitre),
          max_signals: 100,
        },
      });
      installedRules.push({ id: existing.id, rule_id: existing.rule_id, name: hunt.name });
    } else {
      // Migrate away from legacy data-generator-pack-* rule_ids when present.
      const legacyId = legacyHuntRuleId(packId, hunt.name);
      const legacy = (await fetchAllInstalledRules({ kbnClient })).find(
        (r) => r.rule_id === legacyId
      );
      if (legacy) {
        await deleteRules({ kbnClient, ids: [legacy.id] });
      }
      const created = await createCustomRule({
        kbnClient,
        log,
        rule: {
          name: hunt.name,
          description: huntDescription(pack, hunt),
          rule_id: ruleId,
          risk_score: 47,
          severity: 'medium',
          type: hunt.ruleType === 'eql' || hunt.ruleType === 'esql' ? hunt.ruleType : 'query',
          language: hunt.language === 'esql' ? 'esql' : hunt.language === 'eql' ? 'eql' : 'kuery',
          query: hunt.query,
          index: [index],
          from: ruleFrom ?? 'now-30d',
          to: 'now',
          interval: '5m',
          enabled: false,
          tags: packRuleTags(pack),
          threat: buildMitreThreat(hunt.mitre),
          max_signals: 100,
        },
      });
      installedRules.push(created);
    }
  }

  const ids = installedRules.map((r) => r.id);
  if (shouldEnable) {
    await enableRules({ kbnClient, ids });
    log.info(`Pack ${packId}: enabled ${ids.length} hunt rule(s)`);
  } else {
    await disableRules({ kbnClient, ids });
    log.info(
      `Pack ${packId}: installed ${ids.length} hunt rule(s) (disabled; live mode enables by default)`
    );
  }

  return {
    pack,
    index,
    eventCount: events.length,
    fpEventCount: fpEvents.length,
    installedRules,
  };
};

export const cleanPackData = async ({
  esClient,
  kbnClient,
  log,
  packIds,
  startMs,
  endMs,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  packIds: string[];
  startMs: number;
  endMs: number;
}): Promise<void> => {
  const ids = packIds.length > 0 ? packIds : listPacks().map((p) => p.id);
  const dayMs = 24 * 60 * 60 * 1000;
  const startDay = Date.UTC(
    new Date(startMs).getUTCFullYear(),
    new Date(startMs).getUTCMonth(),
    new Date(startMs).getUTCDate()
  );
  const endDay = Date.UTC(
    new Date(endMs).getUTCFullYear(),
    new Date(endMs).getUTCMonth(),
    new Date(endMs).getUTCDate()
  );

  const indices: string[] = [];
  for (const packId of ids) {
    const pack = getPack(packId);
    if (pack) {
      const dataStream = pack.eventSources[0]?.dataStream ?? 'unknown';
      for (let cur = startDay; cur <= endDay; cur += dayMs) {
        indices.push(
          packIndexName({
            packId,
            dataStream,
            endMs,
            dateSuffixOverride: dateSuffix(cur),
          })
        );
        indices.push(
          legacyPackIndexName({
            packId,
            dataStream,
            endMs,
            dateSuffixOverride: dateSuffix(cur),
          })
        );
      }
    }
  }

  if (indices.length > 0) {
    try {
      await esClient.indices.delete({ index: indices, ignore_unavailable: true });
      log.info(`--clean: deleted ${indices.length} pack index name(s)`);
    } catch (e) {
      log.warning(`--clean: failed deleting pack indices: ${String(e)}`);
    }
  }

  const custom = await findGeneratorPackRules({ kbnClient });
  const toDelete =
    packIds.length > 0
      ? custom.filter((r) => {
          return ids.some((id) => {
            const pack = getPack(id);
            if (!pack) return r.rule_id.includes(`-pack-${id}-`);
            return pack.hunts.some(
              (h) =>
                huntRuleId(id, h.name) === r.rule_id || legacyHuntRuleId(id, h.name) === r.rule_id
            );
          });
        })
      : custom;
  if (toDelete.length > 0) {
    await deleteRules({ kbnClient, ids: toDelete.map((r) => r.id) });
    log.info(`--clean: deleted ${toDelete.length} pack custom rule(s)`);
  }
};

export const assertPackProvenanceAuthored = (pack: TechnologyWatchPack): void => {
  for (const src of pack.eventSources) {
    if (src.fidelity !== 'authored') {
      throw new Error(
        `Pack ${pack.id} event source fidelity must be authored (got ${src.fidelity})`
      );
    }
    if (!isString(src.integration) || !isString(src.version) || !isString(src.dataStream)) {
      throw new Error(`Pack ${pack.id} provenance incomplete`);
    }
  }
};
