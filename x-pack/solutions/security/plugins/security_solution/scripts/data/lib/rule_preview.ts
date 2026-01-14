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
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
  previewId: string;
}) => {
  const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;
  const destIndex = `.alerts-security.alerts-${spaceId}`;

  log.info(`Copying preview alerts from ${previewIndex} to ${destIndex} for previewId=${previewId}`);

  try {
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
          op_type: 'create',
        },
      },
    });
  } catch (e) {
    log.error(`Failed to copy preview alerts for previewId=${previewId}`);
    log.error(e);
    throw e;
  }
};

