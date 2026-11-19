/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { toFromSourceQuery } from '@kbn/nightshift-shared';
import { conditionToESQL, type Condition } from '@kbn/streamlang';
import { quoteEsqlString } from '../entity_rows/helpers';
import { WORKLOAD_OWNER_DERIVATION } from '../kubernetes/workloads';
import type { SignalFieldPresence } from './check_signal_fields';
import { getSignalVariantFields } from './types';
import type { SignalCheck, SignalTemplate, SignalTemplateVariant, SkippedSignal } from './types';

const CLUSTER_FIELD = 'orchestrator.cluster.name';
const WORKLOAD_KIND_BY_SUBTYPE = {
  'k8s.deployment': 'deployment',
  'k8s.statefulset': 'statefulset',
  'k8s.daemonset': 'daemonset',
  'k8s.cronjob': 'cronjob',
} as const;

export type MetricsTypeKnowledgeIndicator = Feature & {
  subtype: string;
  filter: Condition;
};

/** Returns true for stored type KIs produced by metrics entity extraction. */
export const isMetricsTypeKnowledgeIndicator = (
  feature: Feature
): feature is MetricsTypeKnowledgeIndicator =>
  feature.properties.origin === 'metrics' &&
  typeof feature.properties.list_query === 'string' &&
  typeof feature.subtype === 'string' &&
  feature.filter !== undefined;

/** Selects templates that apply to at least one stored metrics type KI. */
export const getApplicableSignalTemplates = (
  typeKIs: readonly MetricsTypeKnowledgeIndicator[],
  templates: readonly SignalTemplate[]
): SignalTemplate[] => {
  const subtypes = new Set(typeKIs.map(({ subtype }) => subtype));
  return templates.filter(({ subtypes: templateSubtypes }) =>
    templateSubtypes.some((subtype) => subtypes.has(subtype))
  );
};

const hasVariantFieldsInCluster = (
  fieldPresence: readonly SignalFieldPresence[],
  variant: SignalTemplateVariant,
  cluster: string | undefined
): boolean =>
  fieldPresence.some(
    (presence) =>
      presence.cluster === cluster &&
      presence.dataset === variant.dataset &&
      getSignalVariantFields(variant).every((field) => presence.fields.has(field))
  );

/** Picks one variant per cluster (OTel first) and returns the clusters each variant won. */
const assignVariantsToClusters = (
  template: SignalTemplate,
  fieldPresence: readonly SignalFieldPresence[]
): Array<{ variant: SignalTemplateVariant; clusters: Array<string | undefined> }> => {
  const preferredVariants = [...template.variants].sort(
    (left, right) => Number(right.schema === 'otel') - Number(left.schema === 'otel')
  );
  const clustersByVariant = new Map<SignalTemplateVariant, Array<string | undefined>>();
  for (const cluster of new Set(fieldPresence.map((presence) => presence.cluster))) {
    const variant = preferredVariants.find((candidate) =>
      hasVariantFieldsInCluster(fieldPresence, candidate, cluster)
    );
    if (variant) {
      clustersByVariant.set(variant, [...(clustersByVariant.get(variant) ?? []), cluster]);
    }
  }
  return preferredVariants.flatMap((variant) => {
    const clusters = clustersByVariant.get(variant);
    return clusters ? [{ variant, clusters }] : [];
  });
};

// Comparisons render as COALESCE(..., FALSE), so the NOT keeps rows without a cluster name.
const buildClusterExclusion = (
  clusters: ReadonlyArray<string | undefined>
): Condition | undefined => {
  const names = clusters.filter((cluster): cluster is string => cluster !== undefined);
  const excludeNamed: Condition | undefined =
    names.length === 0
      ? undefined
      : {
          not:
            names.length === 1
              ? { field: CLUSTER_FIELD, eq: names[0] }
              : { or: names.map((name) => ({ field: CLUSTER_FIELD, eq: name })) },
        };
  if (!clusters.includes(undefined)) {
    return excludeNamed;
  }
  const requireCluster: Condition = { field: CLUSTER_FIELD, exists: true };
  return excludeNamed ? { and: [requireCluster, excludeNamed] } : requireCluster;
};

const getBreakdown = (feature: MetricsTypeKnowledgeIndicator): string[] | undefined => {
  const breakdown = feature.properties.breakdown;
  return Array.isArray(breakdown) &&
    breakdown.every((field): field is string => typeof field === 'string')
    ? breakdown
    : undefined;
};

const getWorkloadKind = (
  subtype: string
): (typeof WORKLOAD_KIND_BY_SUBTYPE)[keyof typeof WORKLOAD_KIND_BY_SUBTYPE] | undefined =>
  subtype in WORKLOAD_KIND_BY_SUBTYPE
    ? WORKLOAD_KIND_BY_SUBTYPE[subtype as keyof typeof WORKLOAD_KIND_BY_SUBTYPE]
    : undefined;

const buildAggregationPipeline = ({
  variant,
  breakdown,
}: {
  variant: SignalTemplateVariant;
  breakdown: readonly string[];
}): string => {
  const groupBy = breakdown.join(', ');
  const sampleCount =
    variant.minimumSampleCount === undefined ? '' : `, sample_count = COUNT(${variant.field})`;
  let aggregation: string;

  switch (variant.formulaKind) {
    case 'average':
      aggregation = `| STATS signal_value = AVG(${variant.field})${sampleCount} BY ${groupBy}`;
      break;
    case 'inverse_average':
      aggregation = `| STATS idle_value = AVG(${variant.field})${sampleCount} BY ${groupBy}
| EVAL signal_value = 1 - idle_value`;
      break;
    case 'restart_delta':
      aggregation = `| STATS max_restarts = MAX(${variant.field}),
        min_restarts = MIN(${variant.field})
  BY ${groupBy}, kubernetes.pod.uid, kubernetes.container.name
| EVAL restart_delta = max_restarts - min_restarts
| STATS signal_value = SUM(restart_delta) BY ${groupBy}`;
      break;
    case 'matching_value_count': {
      const { matchingValues } = variant;
      const matchingCondition =
        matchingValues.length === 1
          ? `${variant.field} == ${quoteEsqlString(matchingValues[0])}`
          : `${variant.field} IN (${matchingValues.map(quoteEsqlString).join(', ')})`;
      aggregation = `| STATS signal_value = COUNT(*)
    WHERE ${matchingCondition}
  BY ${groupBy}`;
      break;
    }
    case 'minimum':
      aggregation = `| STATS signal_value = MIN(${variant.field}) BY ${groupBy}`;
      break;
    case 'maximum':
      aggregation = `| STATS signal_value = MAX(${variant.field}) BY ${groupBy}`;
      break;
    case 'error_rate':
      aggregation = `| STATS successful = SUM(${variant.field}), total = COUNT(${variant.field})
  BY ${groupBy}
| WHERE total > 0
| EVAL signal_value = 1 - successful / total`;
      break;
    case 'ratio':
      aggregation = `| STATS numerator_value = AVG(${variant.field}),
        denominator_value = AVG(${variant.denominatorField})
  BY ${groupBy}
| WHERE denominator_value > 0
| EVAL signal_value = TO_DOUBLE(numerator_value) / TO_DOUBLE(denominator_value)`;
      break;
    case 'oom_killed_count':
      aggregation = `| STATS max_restarts = MAX(${variant.field}),
        min_restarts = MIN(${variant.field}),
        matching_reasons = COUNT(${variant.reasonField})
          WHERE ${variant.reasonField} == ${quoteEsqlString(variant.reasonValue)}
  BY ${groupBy}, kubernetes.pod.uid, kubernetes.container.name
| WHERE max_restarts - min_restarts > 0 AND matching_reasons > 0
| STATS signal_value = COUNT(*) BY ${groupBy}`;
      break;
  }

  const sampleThreshold =
    variant.minimumSampleCount === undefined
      ? ''
      : ` AND sample_count >= ${variant.minimumSampleCount}`;
  return `${aggregation}
| WHERE signal_value ${variant.comparison} ${variant.threshold}${sampleThreshold}`;
};

const buildEsqlPreview = ({
  esql,
  subtype,
  scope,
  breakdown,
  window,
  variant,
}: {
  esql: string;
  subtype: string;
  scope: Condition | undefined;
  breakdown: readonly string[];
  window: string;
  variant: SignalTemplateVariant;
}): { breakdown: string[]; esqlPreview: string } => {
  const filters = [
    `@timestamp >= NOW() - ${window}`,
    scope ? conditionToESQL(scope) : undefined,
    `data_stream.dataset == ${quoteEsqlString(variant.dataset)}`,
    variant.preAggregationFilter,
  ].filter((filter): filter is string => filter !== undefined);
  const workloadKind = getWorkloadKind(subtype);
  const resolvedBreakdown = workloadKind
    ? [CLUSTER_FIELD, 'kubernetes.namespace', 'workload']
    : [...breakdown, ...(variant.additionalBreakdown ?? [])];
  const workloadPipeline = workloadKind
    ? `${WORKLOAD_OWNER_DERIVATION}
| WHERE kind == ${quoteEsqlString(workloadKind)}
    AND workload IS NOT NULL
    AND kubernetes.namespace IS NOT NULL`
    : '';
  const workloadSection = workloadPipeline ? `\n${workloadPipeline}` : '';

  return {
    breakdown: resolvedBreakdown,
    esqlPreview: `SET unmapped_fields = "NULLIFY"; ${toFromSourceQuery(esql)}
| WHERE ${filters.join('\n    AND ')}${workloadSection}
${buildAggregationPipeline({ variant, breakdown: resolvedBreakdown })}`,
  };
};

/** Builds runnable signal checks and explains templates that cannot run. */
export const buildSignalChecks = ({
  esql,
  typeKIs,
  templates,
  fieldPresence,
}: {
  esql: string;
  typeKIs: readonly MetricsTypeKnowledgeIndicator[];
  templates: readonly SignalTemplate[];
  fieldPresence: readonly SignalFieldPresence[];
}): { checks: SignalCheck[]; skipped: SkippedSignal[] } => {
  const checks: SignalCheck[] = [];
  const skipped: SkippedSignal[] = [];

  for (const typeKI of typeKIs) {
    const applicableTemplates = templates.filter(({ subtypes }) =>
      subtypes.includes(typeKI.subtype)
    );
    const breakdown = getBreakdown(typeKI);
    for (const template of applicableTemplates) {
      if (!breakdown || breakdown.length === 0) {
        skipped.push({
          signal: template.signal,
          type_ki_id: typeKI.id,
          subtype: typeKI.subtype,
          reason: 'The type KI has no breakdown fields.',
        });
        continue;
      }
      const assignments = assignVariantsToClusters(template, fieldPresence);
      if (assignments.length === 0) {
        skipped.push({
          signal: template.signal,
          type_ki_id: typeKI.id,
          subtype: typeKI.subtype,
          reason: 'No ECS or OTel template field has data in the last hour.',
        });
        continue;
      }
      // A cluster won by an earlier variant is excluded from later ones, so no cluster is counted twice.
      assignments.forEach(({ variant }, index) => {
        const scope = buildClusterExclusion(
          assignments.slice(0, index).flatMap(({ clusters }) => clusters)
        );
        const { breakdown: resolvedBreakdown, esqlPreview } = buildEsqlPreview({
          esql,
          subtype: typeKI.subtype,
          scope,
          breakdown,
          window: template.window,
          variant,
        });
        checks.push({
          signal: template.signal,
          type_ki_id: typeKI.id,
          subtype: typeKI.subtype,
          schema: variant.schema,
          dataset: variant.dataset,
          field: variant.field,
          ...(scope ? { scope } : {}),
          breakdown: resolvedBreakdown,
          formula: variant.formula,
          window: template.window,
          direction: variant.direction,
          threshold: variant.threshold,
          source: variant.source,
          esql_preview: esqlPreview,
        });
      });
    }
  }

  return { checks, skipped };
};
