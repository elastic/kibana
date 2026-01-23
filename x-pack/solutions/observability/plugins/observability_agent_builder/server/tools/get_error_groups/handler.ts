/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { getErrorGroupSamples } from './get_error_group_samples';
import { getDownstreamServicePerGroup } from './get_downstream_service_resources';
import { getFirstSeenPerGroup } from './get_first_seen_per_group';

export type ErrorGroup = Awaited<ReturnType<typeof getErrorGroups>>[number];

export async function getErrorGroups({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
  includeStackTrace,
  includeFirstSeen,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  kqlFilter?: string;
  includeStackTrace?: boolean;
  includeFirstSeen?: boolean;
}) {
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  const errorGroups = await getErrorGroupSamples({
    apmEventClient,
    startMs,
    endMs,
    kqlFilter,
    includeStackTrace,
    logger,
  });

  const [firstSeenMap, downstreamServiceMap] = await Promise.all([
    includeFirstSeen
      ? getFirstSeenPerGroup({ apmEventClient, errorGroups, endMs, logger })
      : undefined,
    getDownstreamServicePerGroup({
      apmEventClient,
      errorGroups,
      startMs,
      endMs,
      logger,
    }),
  ]);

  return errorGroups.map((bucket) => {
    const fields = (bucket.sample?.hits?.hits?.[0]?.fields ?? {}) as Record<string, unknown[]>;
    const sample = unwrapEsFields(fields);
    const traceId = sample['trace.id'] as string | undefined;
    const groupId = bucket.key as string;
    const lastSeenMs = bucket.last_seen?.value ?? 0;
    const downstreamServiceResource = traceId ? downstreamServiceMap.get(traceId) : undefined;

    return {
      groupId,
      count: bucket.doc_count,
      firstSeen: firstSeenMap ? firstSeenMap.get(groupId) : undefined,
      lastSeen: new Date(lastSeenMs).toISOString(),
      sample: {
        ...sample,
        downstreamServiceResource,
      },
    };
  });
}
