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

export const copyPreviewAlertsToRealAlertsIndex = async ({
  esClient,
  log,
  spaceId,
  previewId,
  targetRule,
  timestampRange,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
  previewId: string;
  targetRule?: { id: string; rule_id: string; name: string; risk_score?: number };
  timestampRange?: { startMs: number; endMs: number };
}) => {
  const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;
  const destIndex = `.alerts-security.alerts-${spaceId}`;

  log.info(
    `Copying preview alerts from ${previewIndex} to ${destIndex} for previewId=${previewId}`
  );

  const isDataStream = async (name: string): Promise<boolean> => {
    try {
      // Works in serverless mode; returns 404 if not a data stream.
      await esClient.indices.getDataStream({ name });
      return true;
    } catch (e) {
      // Non-serverless: this name is commonly an alias (e.g. ".alerts-security.alerts-default"),
      // and ES will throw a 400 illegal_argument_exception. Treat as "not a data stream".
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

      // Prefer the index explicitly marked as the write index for the alias.
      for (const [indexName, v] of entries) {
        if (isRecord(v) && isRecord(v.aliases)) {
          const aliasInfo = v.aliases[alias];
          if (isRecord(aliasInfo) && aliasInfo.is_write_index === true) return indexName;
        }
      }

      // If only one concrete index is attached, use it.
      if (entries.length === 1) return entries[0][0];

      // Fallback: choose the lexicographically last index, which generally corresponds to the latest
      // rollover suffix (-00000N) for these alert indices.
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

    // Reindex destination cannot be an alias in self-managed ES; use the resolved write index.
    const reindexDest = destIsDataStream ? destIndex : destWriteIndex ?? destIndex;

    const script = (() => {
      if (!targetRule) return;
      return {
        lang: 'painless',
        params: {
          uuid: targetRule.id,
          rule_id: targetRule.rule_id,
          name: targetRule.name,
          risk_score: targetRule.risk_score,
          startMs: timestampRange?.startMs,
          endMs: timestampRange?.endMs,
        },
        source: `
              // IMPORTANT:
              // Preview alerts often have deterministic _ids that can collide across multiple previews.
              // If we reindex them as-is, later previews overwrite earlier ones and it looks like all
              // alerts came from a single rule. To make attribution stable across multiple rules,
              // namespace both the ES _id and the kibana.alert.uuid by the target rule uuid.
              def newId = ctx._id + ':' + params.uuid;
              ctx._id = newId;
              ctx._source['kibana.alert.uuid'] = newId;

              // Spread alerts across the requested time range to avoid clustering by rule.
              // This makes the UI look more realistic (alerts from different rules interleave).
              if (params.startMs != null && params.endMs != null && params.endMs > params.startMs) {
                long rangeMs = params.endMs - params.startMs;
                // IMPORTANT:
                // Don't use String.hashCode() directly for modulo against a large range (e.g. 60d),
                // because hashCode is 32-bit and caps at ~2.1B. That only spans ~24.8 days in ms.
                //
                // Instead, derive a 64-bit value from the leading hex of the id (our ids are hex-prefixed).
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
                // uh might be negative (signed long holding an unsigned value). Ensure the modulo is in [0, rangeMs).
                // NOTE: Painless doesn't support java.lang.Math.floorMod in all contexts/versions.
                long mod = uh % rangeMs;
                if (mod < 0) { mod = mod + rangeMs; }
                long tsMs = params.startMs + mod;
                def iso = java.time.Instant.ofEpochMilli(tsMs).toString();
                ctx._source['@timestamp'] = iso;
                if (ctx._source.containsKey('kibana.alert.start')) { ctx._source['kibana.alert.start'] = iso; }
                if (ctx._source.containsKey('kibana.alert.last_detected')) { ctx._source['kibana.alert.last_detected'] = iso; }
                if (ctx._source.containsKey('kibana.alert.rule.execution.timestamp')) { ctx._source['kibana.alert.rule.execution.timestamp'] = iso; }
              }

              ctx._source['kibana.alert.rule.uuid'] = params.uuid;
              ctx._source['kibana.alert.rule.rule_id'] = params.rule_id;
              ctx._source['kibana.alert.rule.name'] = params.name;
              ctx._source['kibana.alert.rule.enabled'] = true;
              ctx._source['kibana.alert.rule.producer'] = 'siem';
              if (params.risk_score != null) {
                ctx._source['kibana.alert.risk_score'] = params.risk_score;
                ctx._source['kibana.alert.rule.risk_score'] = params.risk_score;
                if (ctx._source.containsKey('kibana.alert.rule.parameters') && ctx._source['kibana.alert.rule.parameters'] != null) {
                  ctx._source['kibana.alert.rule.parameters'].risk_score = params.risk_score;
                }
              }
              // Mark alerts as generator-owned so --clean can remove only generated docs.
              if (ctx._source.containsKey('kibana.alert.rule.tags') && ctx._source['kibana.alert.rule.tags'] != null) {
                def tags = ctx._source['kibana.alert.rule.tags'];
                if (tags instanceof List) {
                  if (!tags.contains('data-generator')) { tags.add('data-generator'); }
                } else {
                  ctx._source['kibana.alert.rule.tags'] = ['data-generator'];
                }
              } else {
                ctx._source['kibana.alert.rule.tags'] = ['data-generator'];
              }

              if (ctx._source.containsKey('kibana.alert.rule.parameters') && ctx._source['kibana.alert.rule.parameters'] != null) {
                ctx._source['kibana.alert.rule.parameters'].rule_id = params.rule_id;
                // ensure the name isn't overridden by source fields
                ctx._source['kibana.alert.rule.parameters'].rule_name_override = null;
              }
            `,
      };
    })();

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
        // Serverless alerts indices are data streams; reindex dest must use op_type=create.
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
