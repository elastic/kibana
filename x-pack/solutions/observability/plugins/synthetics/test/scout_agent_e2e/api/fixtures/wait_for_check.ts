/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { tryForTime } from '../../../scout/common/fixtures/retry';

export const SYNTHETICS_INDEX_BY_TYPE = {
  http: 'synthetics-http-default',
  tcp: 'synthetics-tcp-default',
  icmp: 'synthetics-icmp-default',
  browser: 'synthetics-browser-default',
} as const;

export type SyntheticsMonitorType = keyof typeof SYNTHETICS_INDEX_BY_TYPE;

interface SyntheticsCheckDoc {
  config_id?: string;
  test_run_id?: string;
  monitor?: { status?: string };
  state?: { status?: string };
  summary?: { up?: number; down?: number; final_attempt?: boolean };
}

export const isCheckUp = (doc: SyntheticsCheckDoc): boolean =>
  doc.monitor?.status === 'up' || doc.state?.status === 'up' || doc.summary?.up === 1;

export async function waitForSyntheticsCheck(
  esClient: EsClient,
  {
    type,
    configId,
    testRunId,
    timeoutMs = 180_000,
  }: {
    type: SyntheticsMonitorType;
    configId: string;
    testRunId?: string;
    timeoutMs?: number;
  }
): Promise<SyntheticsCheckDoc> {
  const index = SYNTHETICS_INDEX_BY_TYPE[type];

  return tryForTime(
    timeoutMs,
    async () => {
      await esClient.indices.refresh({ index, ignore_unavailable: true }).catch(() => undefined);

      const res = await esClient.search<SyntheticsCheckDoc>({
        index,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 1,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [{ term: { config_id: configId } }],
            ...(testRunId ? { should: [{ term: { test_run_id: testRunId } }] } : {}),
          },
        },
      });

      const source = res.hits.hits[0]?._source;
      if (!source) {
        throw new Error(
          `No ${type} check document yet in ${index} for config_id=${configId}` +
            (testRunId ? ` test_run_id=${testRunId}` : '')
        );
      }
      return source;
    },
    { intervalMs: 3_000 }
  );
}
