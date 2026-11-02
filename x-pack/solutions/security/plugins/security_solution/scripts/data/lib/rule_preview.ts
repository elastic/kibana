/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { getStatusCode, isRecord, isString } from './type_guards';

const DETECTION_ENGINE_RULES_PREVIEW = '/api/detection_engine/rules/preview';
const PUBLIC_API_VERSION = '2023-10-31';

export interface RulePreviewRequest {
  rule: Record<string, unknown>;
  invocationCount: number;
  timeframeEndIso: string;
}

export const previewRule = async ({
  kbnClient,
  log,
  req,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  req: RulePreviewRequest;
}): Promise<{ previewId: string }> => {
  const resp = await kbnClient.request<{ previewId?: string; logs?: unknown; isAborted?: boolean }>(
    {
      method: 'POST',
      path: DETECTION_ENGINE_RULES_PREVIEW,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': PUBLIC_API_VERSION,
      },
      body: {
        ...req.rule,
        invocationCount: req.invocationCount,
        timeframeEnd: req.timeframeEndIso,
      },
    }
  );

  const previewId = resp.data.previewId;
  if (!previewId) {
    log.error(`Rule preview did not return previewId. Response: ${JSON.stringify(resp.data)}`);
    throw new Error('Rule preview failed (no previewId)');
  }
  return { previewId };
};

/**
 * Copy preview alerts into the real Security alerts index.
 *
 * Honest matching: does NOT rewrite kibana.alert.rule.name / severity / MITRE / reason onto
 * a different rule. Optionally namespaces document ids (to avoid collisions across previews)
 * and jitter timestamps into the requested range.
 */
export const copyPreviewAlertsToRealAlertsIndex = async ({
  esClient,
  log,
  spaceId,
  previewId,
  namespaceKey,
  ruleUuid,
  timestampRange,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
  previewId: string;
  /** Optional key used to namespace ES _id / kibana.alert.uuid (typically the producing rule uuid). */
  namespaceKey?: string;
  /** Installed rule saved-object id; replaces preview ephemeral rule uuid on copied alerts. */
  ruleUuid?: string;
  timestampRange?: { startMs: number; endMs: number };
}) => {
  const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;
  const destIndex = `.alerts-security.alerts-${spaceId}`;

  log.info(
    `Copying preview alerts from ${previewIndex} to ${destIndex} for previewId=${previewId}`
  );

  const isDataStream = async (name: string): Promise<boolean> => {
    try {
      await esClient.indices.getDataStream({ name });
      return true;
    } catch (e) {
      const status = getStatusCode(e);
      if (status === 400 && isRecord(e)) {
        const meta = e.meta;
        const body = isRecord(meta) ? meta.body : undefined;
        const error = isRecord(body) ? body.error : undefined;
        const reason = isRecord(error) ? error.reason : undefined;
        const type = isRecord(error) ? error.type : undefined;
        if (
          type === 'illegal_argument_exception' &&
          isString(reason) &&
          reason.includes('matches an alias')
        ) {
          return false;
        }
      }
      if (getStatusCode(e) === 404) return false;
      throw e;
    }
  };

  const resolveWriteIndexFromAlias = async (alias: string): Promise<string | undefined> => {
    try {
      const resp = await esClient.indices.getAlias({ name: alias });
      const entries = Object.entries(resp as unknown as Record<string, unknown>);
      if (entries.length === 0) return undefined;

      for (const [indexName, v] of entries) {
        if (isRecord(v) && isRecord(v.aliases)) {
          const aliasInfo = v.aliases[alias];
          if (isRecord(aliasInfo) && aliasInfo.is_write_index === true) return indexName;
        }
      }

      if (entries.length === 1) return entries[0][0];

      return entries
        .map(([indexName]) => indexName)
        .sort()
        .slice(-1)[0];
    } catch (e) {
      if (getStatusCode(e) === 404) return undefined;
      throw e;
    }
  };

  try {
    const srcExists = await esClient.indices.exists({ index: previewIndex });
    if (!srcExists) {
      log.warning(
        `Preview alerts index ${previewIndex} does not exist (no preview alerts were written).`
      );
      return;
    }

    const destIsDataStream = await isDataStream(destIndex);
    const destWriteIndex = destIsDataStream
      ? destIndex
      : await resolveWriteIndexFromAlias(destIndex);
    const destExists =
      destIsDataStream ||
      Boolean(destWriteIndex) ||
      (await esClient.indices.exists({ index: destIndex }));
    if (!destExists) {
      throw new Error(
        `Destination alerts index alias ${destIndex} does not exist. Initialize detections (Security app) and re-run.`
      );
    }

    const reindexDest = destIsDataStream ? destIndex : destWriteIndex ?? destIndex;

    const script = {
      lang: 'painless',
      params: {
        namespaceKey: namespaceKey ?? previewId,
        ruleUuid: ruleUuid ?? null,
        startMs: timestampRange?.startMs,
        endMs: timestampRange?.endMs,
      },
      source: `
              def newId = ctx._id + ':' + params.namespaceKey;
              ctx._id = newId;
              ctx._source['kibana.alert.uuid'] = newId;

              if (params.startMs != null && params.endMs != null && params.endMs > params.startMs) {
                long rangeMs = params.endMs - params.startMs;
                long uh = 0;
                try {
                  String base = newId;
                  if (base.length() >= 16) {
                    String hex = base.substring(0, 16);
                    uh = Long.parseUnsignedLong(hex, 16);
                  } else {
                    uh = ((long)(base.hashCode())) & 0x7fffffffL;
                  }
                } catch (Exception e) {
                  uh = ((long)(newId.hashCode())) & 0x7fffffffL;
                }
                long mod = uh % rangeMs;
                if (mod < 0) { mod = mod + rangeMs; }
                long tsMs = params.startMs + mod;
                def iso = java.time.Instant.ofEpochMilli(tsMs).toString();
                ctx._source['@timestamp'] = iso;
                if (ctx._source.containsKey('kibana.alert.start')) { ctx._source['kibana.alert.start'] = iso; }
                if (ctx._source.containsKey('kibana.alert.last_detected')) { ctx._source['kibana.alert.last_detected'] = iso; }
                if (ctx._source.containsKey('kibana.alert.rule.execution.timestamp')) { ctx._source['kibana.alert.rule.execution.timestamp'] = iso; }
              }

              // Look like detection-engine alerts, not Rule Preview.
              ctx._source['kibana.alert.rule.producer'] = 'siem';
              if (params.ruleUuid != null) {
                ctx._source['kibana.alert.rule.uuid'] = params.ruleUuid;
              }

              // Honest attribution: do not overwrite rule name / severity / MITRE / reason.
              // Stamp ownership tags for --clean / FP evals. FP is sourced from event tags
              // (never from the hunt rule itself, or every alert from that hunt would be FP).
              if (ctx._source['kibana.alert.rule.tags'] == null) {
                ctx._source['kibana.alert.rule.tags'] = new ArrayList();
              }
              def ruleTags = ctx._source['kibana.alert.rule.tags'];
              if (!ruleTags.contains('data-generator')) {
                ruleTags.add('data-generator');
              }
              boolean isFp = false;
              if (ctx._source.containsKey('tags') && ctx._source.tags != null) {
                for (def t : ctx._source.tags) {
                  if (t == 'data-generator-fp') { isFp = true; break; }
                }
              }
              if (isFp && !ruleTags.contains('data-generator-fp')) {
                ruleTags.add('data-generator-fp');
              }
            `,
    };

    await esClient.reindex({
      wait_for_completion: true,
      refresh: true,
      source: {
        index: previewIndex,
        query: {
          term: {
            'kibana.alert.rule.uuid': previewId,
          },
        },
      },
      dest: {
        index: reindexDest,
        ...(destIsDataStream ? { op_type: 'create' } : {}),
      },
      script,
      conflicts: 'proceed',
    });
  } catch (e) {
    log.error(`Failed to copy preview alerts for previewId=${previewId}`);
    log.error(e);
    throw e;
  }
};
