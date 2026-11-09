/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  type InvestigationSeed,
  isEsqlQuery,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import {
  type ChangePoint,
  type MetricAggregationType,
  changePointSignalBand,
  changePointWindow,
  getMetricChangePoints,
  timingBand,
} from '@kbn/signals-server';
import {
  type AnalyzerApplicability,
  type InvestigationLead,
  type SignalAnalyzer,
  type SignalAnalyzerResult,
  compareLeads,
} from '@kbn/signal-investigation-contract';
import pLimit from 'p-limit';
import type { MetricsDataClient } from '../client';

export const METRIC_CHANGE_POINTS_ANALYZER_ID = 'metric_change_points';
export const MAX_METRIC_LEADS = 25;

const METRIC_QUERY_CONCURRENCY = 3;
const HOST_CPU_FIELD = 'system.cpu.total.norm.pct';
const HOST_MEMORY_FIELD = 'system.memory.actual.used.pct';

export interface HostMetricDescriptor {
  field: string;
  type: MetricAggregationType;
  label: string;
}

export interface TaggedMetricChangePoint {
  metric: HostMetricDescriptor;
  bucket: ChangePoint;
}

export const metricChangePointsApplicability = (seed: InvestigationSeed): AnalyzerApplicability => {
  if (seed.query && isEsqlQuery(seed.query)) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.esqlUnsupported',
        {
          defaultMessage: 'Metric change points do not run on ES|QL queries.',
        }
      ),
    };
  }
  if (resolveInvestigationHosts(seed).length === 0) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.needsHost',
        {
          defaultMessage: 'This analysis needs a host name.',
        }
      ),
    };
  }
  return { applicable: true };
};

export const buildHostKql = (hosts: readonly string[]): string => {
  if (hosts.length === 0) {
    throw new Error('This analysis requires at least one host name');
  }
  return hosts.map((host) => `host.name : "${escapeQuotes(host)}"`).join(' or ');
};

const toMetricAggregationType = (
  operationType: string | undefined
): MetricAggregationType | undefined => {
  switch (operationType) {
    case 'avg':
    case 'average':
      return 'avg';
    case 'max':
    case 'maximum':
      return 'max';
    case 'min':
    case 'minimum':
      return 'min';
    case 'sum':
      return 'sum';
    case 'p95':
      return 'p95';
    case 'p99':
      return 'p99';
    default:
      return undefined;
  }
};

export const selectMetricDescriptors = (seed: InvestigationSeed): HostMetricDescriptor[] => {
  const descriptors: HostMetricDescriptor[] = [
    {
      field: HOST_CPU_FIELD,
      type: 'avg',
      label: i18n.translate('xpack.metricsData.signalInvestigation.metricChangePoints.metric.cpu', {
        defaultMessage: 'CPU usage',
      }),
    },
    {
      field: HOST_MEMORY_FIELD,
      type: 'avg',
      label: i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.metric.memory',
        {
          defaultMessage: 'Memory usage',
        }
      ),
    },
  ];

  const customField = seed.metric?.field;
  const customType = toMetricAggregationType(seed.metric?.operationType);
  if (
    customField &&
    customType &&
    !descriptors.some((descriptor) => descriptor.field === customField)
  ) {
    descriptors.push({
      field: customField,
      type: customType,
      label: customField,
    });
  }

  return descriptors;
};

const changeTypeLabel = (type: string): string => {
  switch (type) {
    case 'spike':
      return i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.changeType.spike',
        {
          defaultMessage: 'spike',
        }
      );
    case 'dip':
      return i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.changeType.dip',
        {
          defaultMessage: 'dip',
        }
      );
    case 'step_change':
      return i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.changeType.stepChange',
        {
          defaultMessage: 'step change',
        }
      );
    case 'trend_change':
      return i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.changeType.trendChange',
        {
          defaultMessage: 'trend change',
        }
      );
    case 'distribution_change':
      return i18n.translate(
        'xpack.metricsData.signalInvestigation.metricChangePoints.changeType.distributionChange',
        { defaultMessage: 'distribution change' }
      );
    default:
      return type;
  }
};

const NO_CHANGE_POINT_TYPES: ReadonlySet<string> = new Set([
  'stationary',
  'non_stationary',
  'indeterminable',
]);

const indeterminableResult = (): SignalAnalyzerResult => ({
  leads: [],
  entities: {},
  status: 'indeterminable',
  message: i18n.translate(
    'xpack.metricsData.signalInvestigation.metricChangePoints.indeterminable',
    {
      defaultMessage: 'Not enough data to decide',
    }
  ),
});

const hostRelevance = (hostName: string, serviceName: string | undefined): string => {
  if (serviceName) {
    return i18n.translate('xpack.metricsData.signalInvestigation.metricChangePoints.serviceHost', {
      defaultMessage: 'Host {hostName} for service {serviceName}',
      values: { hostName, serviceName },
    });
  }
  return i18n.translate('xpack.metricsData.signalInvestigation.metricChangePoints.sameHost', {
    defaultMessage: 'Host {hostName}',
    values: { hostName },
  });
};

/** Maps grouped host metric change-point buckets to ranked leads and an explicit analyzer status. */
export const mapMetricChangePointBuckets = ({
  items,
  seed,
  hosts,
}: {
  items: readonly TaggedMetricChangePoint[];
  seed: InvestigationSeed;
  hosts: readonly string[];
}): SignalAnalyzerResult => {
  if (items.length === 0) {
    return indeterminableResult();
  }

  const significant = items.filter(({ bucket }) => !NO_CHANGE_POINT_TYPES.has(bucket.changes.type));
  if (significant.length === 0) {
    const anyEvaluated = items.some(({ bucket }) => bucket.changes.type !== 'indeterminable');
    return anyEvaluated ? { leads: [], entities: {}, status: 'no_change' } : indeterminableResult();
  }

  const serviceName = seed.entities['service.name'];
  const allLeads: InvestigationLead[] = significant.map(({ metric, bucket }) => {
    const hostName = String(bucket.key || hosts[0] || '').trim() || hosts[0] || 'host';
    return {
      id: [
        METRIC_CHANGE_POINTS_ANALYZER_ID,
        hostName,
        metric.field,
        bucket.changes.time ?? 'unknown',
        bucket.changes.type,
      ].join(':'),
      analyzerId: METRIC_CHANGE_POINTS_ANALYZER_ID,
      summary: i18n.translate('xpack.metricsData.signalInvestigation.metricChangePoints.summary', {
        defaultMessage: '{metric} {changeType} on {hostName}',
        values: {
          metric: metric.label,
          changeType: changeTypeLabel(bucket.changes.type),
          hostName,
        },
      }),
      occurredAt: bucket.changes.time,
      relevance: hostRelevance(hostName, serviceName),
      ranking: {
        signal: changePointSignalBand(bucket.changes.p_value),
        timing: timingBand(bucket.changes.time, seed.timeRange.from, seed.timeRange.to),
        relationship: 'host',
      },
      locatorParams: {
        hostName,
        metricField: metric.field,
        rangeFrom: seed.timeRange.from,
        rangeTo: seed.timeRange.to,
        ...(seed.dataViewId ? { dataViewId: seed.dataViewId } : {}),
      },
    };
  });

  const ranked = [...allLeads].sort(compareLeads);
  const leads = ranked.slice(0, MAX_METRIC_LEADS);
  const truncated = ranked.length > MAX_METRIC_LEADS;

  return {
    leads,
    entities: {},
    status: 'found',
    message: truncated
      ? i18n.translate('xpack.metricsData.signalInvestigation.metricChangePoints.leadCap', {
          defaultMessage: 'Showing the first {max} leads.',
          values: { max: MAX_METRIC_LEADS },
        })
      : undefined,
  };
};

export const createMetricChangePointsAnalyzer = ({
  client,
}: {
  client: Pick<MetricsDataClient, 'getMetricIndices'>;
}): SignalAnalyzer => ({
  id: METRIC_CHANGE_POINTS_ANALYZER_ID,
  displayName: i18n.translate(
    'xpack.metricsData.signalInvestigation.metricChangePoints.displayName',
    {
      defaultMessage: 'Host metric change points',
    }
  ),
  authz: 'es_delegated',
  getApplicability: metricChangePointsApplicability,
  run: async (seed, deps, abortSignal) => {
    const hosts = resolveInvestigationHosts(seed);
    const kqlFilter = buildHostKql(hosts);
    const { start, end } = changePointWindow(seed.timeRange.from, seed.timeRange.to);
    const core = await deps.context.core;
    const savedObjectsClient = core.savedObjects.getClient({
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    const index = await client.getMetricIndices({ savedObjectsClient });
    const descriptors = selectMetricDescriptors(seed);
    const limit = pLimit(METRIC_QUERY_CONCURRENCY);

    const batches = await Promise.all(
      descriptors.map((metric) =>
        limit(async () => {
          const buckets = await getMetricChangePoints({
            esClient: core.elasticsearch.client,
            index,
            start,
            end,
            kqlFilter,
            groupBy: ['host.name'],
            aggregation: { field: metric.field, type: metric.type },
            signal: abortSignal,
          });
          return buckets.map((bucket): TaggedMetricChangePoint => ({ metric, bucket }));
        })
      )
    );

    return mapMetricChangePointBuckets({
      items: batches.flat(),
      seed,
      hosts,
    });
  },
});
