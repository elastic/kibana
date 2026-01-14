/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';

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
  const resp = await kbnClient.request<{ previewId?: string; logs?: unknown; isAborted?: boolean }>({
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
  });

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
  targetRule?: { id: string; rule_id: string; name: string };
  timestampRange?: { startMs: number; endMs: number };
}) => {
  const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;
  const destIndex = `.alerts-security.alerts-${spaceId}`;

  log.info(`Copying preview alerts from ${previewIndex} to ${destIndex} for previewId=${previewId}`);

  try {
    const srcExists = await esClient.indices.exists({ index: previewIndex });
    if (!srcExists) {
      log.warning(`Preview alerts index ${previewIndex} does not exist (no preview alerts were written).`);
      return;
    }

    const destExists = await esClient.indices.exists({ index: destIndex });
    if (!destExists) {
      throw new Error(
        `Destination alerts index alias ${destIndex} does not exist. Initialize detections (Security app) and re-run.`
      );
    }

    await esClient.reindex({
      wait_for_completion: true,
      refresh: true,
      body: {
        source: {
          index: previewIndex,
          query: {
            term: {
              'kibana.alert.rule.uuid': previewId,
            },
          },
        },
        dest: {
          index: destIndex,
          // Use "index" so repeated runs can overwrite documents that share deterministic _ids.
          op_type: 'index',
        },
        script: targetRule
          ? {
              lang: 'painless',
              params: {
                uuid: targetRule.id,
                rule_id: targetRule.rule_id,
                name: targetRule.name,
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
                  long h = (newId).hashCode();
                  if (h < 0) { h = -h; }
                  long tsMs = params.startMs + (h % rangeMs);
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

                if (ctx._source.containsKey('kibana.alert.rule.parameters') && ctx._source['kibana.alert.rule.parameters'] != null) {
                  ctx._source['kibana.alert.rule.parameters'].rule_id = params.rule_id;
                  // ensure the name isn't overridden by source fields
                  ctx._source['kibana.alert.rule.parameters'].rule_name_override = null;
                }
              `,
            }
          : undefined,
      },
      conflicts: 'proceed',
    });
  } catch (e) {
    log.error(`Failed to copy preview alerts for previewId=${previewId}`);
    log.error(e);
    throw e;
  }
};

