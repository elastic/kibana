/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFromSourceQuery } from '@kbn/nightshift-shared';
import { conditionToESQL, type Condition } from '@kbn/streamlang';
import { quoteEsqlString } from '../entity_rows/helpers';
import { WORKLOAD_OWNER_DERIVATION } from '../kubernetes/workloads';
import { CLUSTER_FIELD } from './plan_signal_checks';
import type { SignalTemplateVariant } from './types';

const WORKLOAD_KIND_BY_SUBTYPE: Readonly<Record<string, string>> = {
  'k8s.deployment': 'deployment',
  'k8s.statefulset': 'statefulset',
  'k8s.daemonset': 'daemonset',
  'k8s.cronjob': 'cronjob',
};
// Restart counters belong to one pod instance, so restarts group by pod uid.
const POD_INSTANCE_KEYS = 'kubernetes.pod.uid, kubernetes.container.name';
// Limits apply per container; the pod name keeps the offending container readable.
const CONTAINER_KEYS = 'kubernetes.pod.name, kubernetes.container.name';

const datasetCondition = ({ dataset }: SignalTemplateVariant): string =>
  `data_stream.dataset == ${quoteEsqlString(dataset)}`;

const buildVariantFilter = (variants: readonly SignalTemplateVariant[]): string => {
  const clauses = variants.map((variant) =>
    variant.preAggregationFilter
      ? `(${datasetCondition(variant)} AND ${variant.preAggregationFilter})`
      : datasetCondition(variant)
  );
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

/**
 * Averages each variant per group, then keeps the first non-null value, so every entity is
 * measured with its preferred schema. With one variant this is a plain average.
 */
const renderMergedAverage = (
  variants: readonly SignalTemplateVariant[],
  groupBy: string,
  valueName: string
): string => {
  const merged = variants.length > 1;
  const { minimumSampleCount } = variants[0];
  const arms = variants.map((variant, index) => {
    // Field names can exist in both schemas (OTel docs carry ECS aliases), so pin each arm to its dataset.
    const ownDataset = merged ? ` WHERE ${datasetCondition(variant)}` : '';
    const average = `average_${index}`;
    return {
      aggregations: [
        `${average} = AVG(${variant.field})${ownDataset}`,
        ...(minimumSampleCount === undefined
          ? []
          : [`samples_${index} = COUNT(${variant.field})${ownDataset}`]),
      ],
      value: variant.formulaKind === 'inverse_average' ? `1 - ${average}` : average,
      hasValue: `${average} IS NOT NULL`,
      samples: `samples_${index}`,
    };
  });
  const value = merged ? `COALESCE(${arms.map((arm) => arm.value).join(', ')})` : arms[0].value;
  const lastArm = arms[arms.length - 1];
  const samples = merged
    ? `CASE(${arms
        .slice(0, -1)
        .map((arm) => `${arm.hasValue}, ${arm.samples}`)
        .join(', ')}, ${lastArm.samples})`
    : arms[0].samples;

  return [
    `| STATS ${arms.flatMap((arm) => arm.aggregations).join(',\n        ')}\n  BY ${groupBy}`,
    `| EVAL ${valueName} = ${value}`,
    ...(minimumSampleCount === undefined
      ? []
      : [`| EVAL sample_count = ${samples}`, `| WHERE sample_count >= ${minimumSampleCount}`]),
  ].join('\n');
};

const renderAggregation = (variants: readonly SignalTemplateVariant[], groupBy: string): string => {
  const [variant] = variants;
  const breach = `${variant.comparison} ${variant.threshold}`;

  switch (variant.formulaKind) {
    case 'average':
    case 'inverse_average':
      return renderMergedAverage(variants, groupBy, 'signal_value');
    case 'container_average':
      return `${renderMergedAverage(variants, `${groupBy}, ${CONTAINER_KEYS}`, 'container_value')}
| STATS signal_value = MAX(container_value),
        breached_containers = VALUES(CONCAT(kubernetes.pod.name, "/", kubernetes.container.name))
          WHERE container_value ${breach}
  BY ${groupBy}`;
    case 'restart_delta':
      return `| STATS max_restarts = MAX(${variant.field}),
        min_restarts = MIN(${variant.field})
  BY ${groupBy}, ${POD_INSTANCE_KEYS}
| EVAL restart_delta = max_restarts - min_restarts
| STATS signal_value = SUM(restart_delta) BY ${groupBy}`;
    case 'matching_value_count': {
      const { matchingValues } = variant;
      const matchingCondition =
        matchingValues.length === 1
          ? `${variant.field} == ${quoteEsqlString(matchingValues[0])}`
          : `${variant.field} IN (${matchingValues.map(quoteEsqlString).join(', ')})`;
      return `| STATS signal_value = COUNT(*)
    WHERE ${matchingCondition}
  BY ${groupBy}`;
    }
    case 'minimum':
      return `| STATS signal_value = MIN(${variant.field}) BY ${groupBy}`;
    case 'maximum':
      return `| STATS signal_value = MAX(${variant.field}) BY ${groupBy}`;
    case 'error_rate':
      // COUNT on an APM success count returns the number of requests, not documents.
      return `| STATS successful = SUM(${variant.field}), sample_count = COUNT(${variant.field})
  BY ${groupBy}
| WHERE sample_count >= ${variant.minimumSampleCount ?? 1}
| EVAL signal_value = 1 - TO_DOUBLE(successful) / sample_count`;
    case 'ratio':
      return `| STATS numerator_value = AVG(${variant.field}),
        denominator_value = AVG(${variant.denominatorField})
  BY ${groupBy}
| WHERE denominator_value > 0
| EVAL signal_value = TO_DOUBLE(numerator_value) / TO_DOUBLE(denominator_value)`;
    case 'oom_killed_count':
      return `| STATS max_restarts = MAX(${variant.field}),
        min_restarts = MIN(${variant.field}),
        matching_reasons = COUNT(${variant.reasonField})
          WHERE ${variant.reasonField} == ${quoteEsqlString(variant.reasonValue)}
  BY ${groupBy}, ${POD_INSTANCE_KEYS}
| WHERE max_restarts - min_restarts > 0 AND matching_reasons > 0
| STATS signal_value = COUNT(*) BY ${groupBy}`;
  }
};

/** Renders the breach preview for one planned check: rows are the groups over the threshold. */
export const renderSignalQuery = ({
  esql,
  subtype,
  scope,
  breakdown,
  window,
  variants,
}: {
  esql: string;
  subtype: string;
  scope?: Condition;
  breakdown: readonly string[];
  window: string;
  variants: readonly SignalTemplateVariant[];
}): { breakdown: string[]; esqlPreview: string } => {
  const [variant] = variants;
  const workloadKind = WORKLOAD_KIND_BY_SUBTYPE[subtype];
  // Workload KIs break down by an owner field that not every document has; the shared
  // derivation fills it from ReplicaSet and Job names, as entity extraction does.
  const resolvedBreakdown = workloadKind
    ? [CLUSTER_FIELD, 'kubernetes.namespace', 'workload']
    : [...breakdown, ...(variant.additionalBreakdown ?? [])];
  const filters = [
    `@timestamp >= NOW() - ${window}`,
    ...(scope ? [conditionToESQL(scope)] : []),
    buildVariantFilter(variants),
  ];
  const workloadPipeline = workloadKind
    ? [
        WORKLOAD_OWNER_DERIVATION,
        `| WHERE kind == ${quoteEsqlString(workloadKind)}
    AND workload IS NOT NULL
    AND kubernetes.namespace IS NOT NULL`,
      ]
    : [];

  return {
    breakdown: resolvedBreakdown,
    esqlPreview: [
      `SET unmapped_fields = "NULLIFY"; ${toFromSourceQuery(esql)}`,
      `| WHERE ${filters.join('\n    AND ')}`,
      ...workloadPipeline,
      renderAggregation(variants, resolvedBreakdown.join(', ')),
      `| WHERE signal_value ${variant.comparison} ${variant.threshold}`,
    ].join('\n'),
  };
};
