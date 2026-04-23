/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';

export interface TermsAggBuckets {
  buckets: Array<{ key: string; doc_count: number }>;
}

export const FALSE_POSITIVE_THRESHOLD = 10;

export const RICH_ALERT_SOURCE_FIELDS = [
  '@timestamp',
  'kibana.alert.rule.name',
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.threat',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'kibana.alert.reason',
  'host.name',
  'host.os.name',
  'user.name',
  'source.ip',
  'destination.ip',
  'process.name',
  'process.command_line',
  'message',
];

const RESPONSE_ONLY_FIELDS = [
  'id',
  'immutable',
  'rule_source',
  'updated_at',
  'updated_by',
  'created_at',
  'created_by',
  'revision',
  'execution_summary',
  'required_fields',
  'related_integrations',
  'setup',
  'output_index',
  'meta',
] as const;

export const toBucketList = (agg: TermsAggBuckets | undefined) =>
  agg?.buckets.map((b) => ({ value: b.key, alertCount: b.doc_count })) ?? [];

export const ruleResponseToCreateProps = (rule: RuleResponse): Record<string, unknown> => {
  const ruleObj = rule as unknown as Record<string, unknown>;
  const createProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(ruleObj)) {
    if (!(RESPONSE_ONLY_FIELDS as readonly string[]).includes(key) && value !== undefined) {
      createProps[key] = value;
    }
  }

  delete createProps.enabled;

  return createProps;
};

export const parseIntervalToMinutes = (intervalStr: string): number => {
  const match = intervalStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 5;
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value / 60;
    case 'm':
      return value;
    case 'h':
      return value * 60;
    case 'd':
      return value * 1440;
    default:
      return 5;
  }
};

export const buildKibanaApiHeaders = (request: KibanaRequest): Record<string, string> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'kbn-xsrf': 'true',
    'elastic-api-version': '2023-10-31',
  };
  const rawHeaders = request.headers;
  if (rawHeaders.authorization) {
    headers.authorization = String(rawHeaders.authorization);
  }
  if (rawHeaders.cookie) {
    headers.cookie = String(rawHeaders.cookie);
  }
  return headers;
};

export const getKibanaBaseUrl = async (
  core: SecuritySolutionPluginCoreSetupDependencies
): Promise<{ baseUrl: string; serverBasePath: string }> => {
  const [coreStart] = await core.getStartServices();
  const { protocol, hostname, port } = coreStart.http.getServerInfo();
  const serverBasePath = coreStart.http.basePath.serverBasePath;
  return {
    baseUrl: `${protocol}://${hostname}:${port}`,
    serverBasePath,
  };
};

export interface PreviewRunResult {
  previewId: string;
  alertCount: number;
  errors: string[];
  isAborted: boolean;
}

export const runPreview = async ({
  createProps,
  invocationCount,
  timeframeEnd,
  request,
  esClient,
  spaceId,
  baseUrl,
  previewUrl,
  label,
}: {
  createProps: Record<string, unknown>;
  invocationCount: number;
  timeframeEnd: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  spaceId: string;
  baseUrl: string;
  previewUrl: string;
  label: string;
}): Promise<PreviewRunResult> => {
  const body = {
    ...createProps,
    invocationCount,
    timeframeEnd,
  };
  console.log(`[${label}] Rule preview HTTP request body:`, JSON.stringify(body, null, 2));

  const headers = buildKibanaApiHeaders(request);

  console.log(`[${label}] Calling preview API: ${baseUrl}${previewUrl}`);
  const previewResponse = await fetch(`${baseUrl}${previewUrl}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  console.log(`[${label}] Preview API response status: ${previewResponse.status}`);

  if (!previewResponse.ok) {
    const errorText = await previewResponse.text();
    console.log(`[${label}] Preview API error body: ${errorText}`);
    console.log(
      `[${label}] ERROR: Rule preview API returned ${previewResponse.status}: ${errorText}`
    );
    throw new Error(`Rule preview failed (HTTP ${previewResponse.status}): ${errorText}`);
  }

  const previewResult = (await previewResponse.json()) as {
    previewId?: string;
    logs?: Array<{ errors: string[]; warnings: string[] }>;
    isAborted?: boolean;
  };
  console.log(`[${label}] Preview result:`, JSON.stringify(previewResult, null, 2));

  const errors = previewResult.logs?.flatMap((l) => l.errors).filter(Boolean) ?? [];

  if (!previewResult.previewId) {
    throw new Error(
      `Preview did not produce a previewId. Errors: ${
        errors.length > 0 ? errors.join('; ') : 'none'
      }`
    );
  }

  const previewIndex = `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
  const alertsQuery = {
    index: previewIndex,
    size: 1000,
    query: {
      bool: {
        filter: [{ term: { 'kibana.alert.rule.uuid': previewResult.previewId } }],
      },
    },
    track_total_hits: true,
    ignore_unavailable: true,
  };
  console.log(`[${label}] Alerts retrieval ES query:`, JSON.stringify(alertsQuery, null, 2));

  const alertsResult = await esClient.asCurrentUser.search(alertsQuery);

  const alertCount =
    typeof alertsResult.hits.total === 'number'
      ? alertsResult.hits.total
      : alertsResult.hits.total?.value ?? 0;

  console.log(`[${label}] Alert count: ${alertCount}`);

  return {
    previewId: previewResult.previewId,
    alertCount,
    errors,
    isAborted: previewResult.isAborted ?? false,
  };
};
