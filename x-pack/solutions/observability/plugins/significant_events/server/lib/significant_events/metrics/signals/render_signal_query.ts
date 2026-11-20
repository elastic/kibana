/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFromSourceQuery } from '@kbn/nightshift-shared';
import { quoteEsqlString } from '../entity_rows/helpers';
import { WORKLOAD_OWNER_DERIVATION } from '../kubernetes/workloads';
import type { SignalTemplate, SignalTemplateVariant, SignalTemplateEntityField } from './types';

const CLUSTER_FIELD = 'orchestrator.cluster.name';
const POD_FIELD = 'kubernetes.pod.name';
const CONTAINER_FIELD = 'kubernetes.container.name';
const PREVIEW_WINDOW = '15 minutes';
export const DEFINITION_PREVIEW_LIMIT = 10_000;

const WORKLOAD_KIND_BY_SUBTYPE: Readonly<Record<string, string>> = {
  'k8s.deployment': 'deployment',
  'k8s.statefulset': 'statefulset',
  'k8s.daemonset': 'daemonset',
  'k8s.cronjob': 'cronjob',
};

const datasetCondition = ({ dataset }: SignalTemplateVariant): string =>
  `data_stream.dataset == ${quoteEsqlString(dataset)}`;

const variantCondition = (variant: SignalTemplateVariant): string =>
  variant.preAggregationFilter
    ? `(${datasetCondition(variant)} AND ${variant.preAggregationFilter})`
    : datasetCondition(variant);

const buildVariantFilter = (variants: readonly SignalTemplateVariant[]): string => {
  const clauses = variants.map(variantCondition);
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

const filteredAggregation = (
  name: string,
  expression: string,
  variant: SignalTemplateVariant
): string => `${name} = ${expression} WHERE ${variantCondition(variant)}`;

const coalesce = (columns: readonly string[]): string =>
  columns.length === 1 ? columns[0] : `COALESCE(${columns.join(', ')})`;

const renderEntityFieldDerivations = (
  additionalEntityFields: readonly SignalTemplateEntityField[]
): string[] =>
  additionalEntityFields.flatMap(({ name, fields }) => {
    if (fields.length === 1 && fields[0] === name) {
      return [];
    }
    return [`| EVAL ${name} = ${coalesce(fields)}`];
  });

interface VariantArm {
  aggregations: string[];
  evaluations: string[];
  valueColumn: string;
  contextColumns: Readonly<Record<string, string>>;
}

const renderVariantArm = (
  variant: SignalTemplateVariant,
  index: number,
  sampleColumn: string | undefined
): VariantArm => {
  const valueColumn = `value_${index}`;
  const sampleCountColumn = sampleColumn ? `${sampleColumn}_${index}` : undefined;
  const sampleAggregation = sampleCountColumn
    ? [filteredAggregation(sampleCountColumn, `COUNT(${variant.field})`, variant)]
    : [];
  const sampleContext =
    sampleColumn && sampleCountColumn ? { [sampleColumn]: sampleCountColumn } : {};

  switch (variant.formulaKind) {
    case 'average':
      return {
        aggregations: [
          filteredAggregation(valueColumn, `AVG(${variant.field})`, variant),
          ...sampleAggregation,
        ],
        evaluations: [],
        valueColumn,
        contextColumns: sampleContext,
      };
    case 'inverse_average': {
      const averageColumn = `average_${index}`;
      return {
        aggregations: [
          filteredAggregation(averageColumn, `AVG(${variant.field})`, variant),
          ...sampleAggregation,
        ],
        evaluations: [`${valueColumn} = 1 - ${averageColumn}`],
        valueColumn,
        contextColumns: sampleContext,
      };
    }
    case 'matching_value_count':
      return {
        aggregations: [
          filteredAggregation(
            valueColumn,
            `MAX(CASE(${variant.field} IN (${variant.matchingValues
              .map(quoteEsqlString)
              .join(', ')}), 1, 0))`,
            variant
          ),
        ],
        evaluations: [],
        valueColumn,
        contextColumns: {},
      };
    case 'minimum': {
      const minimumColumn = `minimum_${index}`;
      return {
        aggregations: [filteredAggregation(minimumColumn, `MIN(${variant.field})`, variant)],
        evaluations: [`${valueColumn} = 1 - ${minimumColumn}`],
        valueColumn,
        contextColumns: {},
      };
    }
    case 'maximum':
      return {
        aggregations: [filteredAggregation(valueColumn, `MAX(${variant.field})`, variant)],
        evaluations: [],
        valueColumn,
        contextColumns: {},
      };
    case 'ratio': {
      const numeratorColumn = `numerator_${index}`;
      const denominatorColumn = `denominator_${index}`;
      return {
        aggregations: [
          filteredAggregation(numeratorColumn, `AVG(${variant.field})`, variant),
          filteredAggregation(denominatorColumn, `AVG(${variant.denominatorField})`, variant),
        ],
        evaluations: [
          `${valueColumn} = CASE(${denominatorColumn} > 0, TO_DOUBLE(${numeratorColumn}) / TO_DOUBLE(${denominatorColumn}), NULL)`,
        ],
        valueColumn,
        contextColumns: {},
      };
    }
    case 'error_rate': {
      const successfulColumn = `successful_${index}`;
      const requestCountColumn = `request_count_${index}`;
      return {
        aggregations: [
          filteredAggregation(successfulColumn, `SUM(${variant.field})`, variant),
          filteredAggregation(requestCountColumn, `COUNT(${variant.field})`, variant),
        ],
        evaluations: [
          `${valueColumn} = CASE(${requestCountColumn} > 0, 1 - TO_DOUBLE(${successfulColumn}) / ${requestCountColumn}, NULL)`,
        ],
        valueColumn,
        contextColumns: { request_count: requestCountColumn },
      };
    }
    case 'container_average':
      throw new Error('Container averages require the container measurement pipeline.');
  }
};

const renderGenericAggregation = ({
  variants,
  entityFields,
  contextColumns,
  sampleColumn,
}: {
  variants: readonly SignalTemplateVariant[];
  entityFields: readonly string[];
  contextColumns: readonly string[];
  sampleColumn?: string;
}): string => {
  const arms = variants.map((variant, index) => renderVariantArm(variant, index, sampleColumn));
  const evaluations = arms.flatMap(({ evaluations: armEvaluations }) => armEvaluations);
  const outputEvaluations = [
    `value = ${coalesce(arms.map(({ valueColumn }) => valueColumn))}`,
    ...contextColumns.map((column) => {
      const armColumns = arms.flatMap(({ contextColumns: armContext }) =>
        armContext[column] ? [armContext[column]] : []
      );
      return `${column} = ${coalesce(armColumns)}`;
    }),
  ];

  return [
    `| STATS ${arms.flatMap(({ aggregations }) => aggregations).join(',\n        ')}
  BY ${entityFields.join(', ')}`,
    ...(evaluations.length > 0 ? [`| EVAL ${evaluations.join(',\n       ')}`] : []),
    `| EVAL ${outputEvaluations.join(',\n       ')}`,
    `| KEEP ${[...entityFields, 'value', ...contextColumns].join(', ')}`,
  ].join('\n');
};

const renderContainerAggregation = (
  variants: readonly SignalTemplateVariant[],
  entityFields: readonly string[]
): string => {
  const containerArms = variants.map((variant, index) =>
    filteredAggregation(`container_value_${index}`, `AVG(${variant.field})`, variant)
  );
  const containerValue = coalesce(variants.map((_, index) => `container_value_${index}`));

  return `| INLINE STATS ${containerArms.join(',\n               ')}
  BY ${[...entityFields, POD_FIELD, CONTAINER_FIELD].join(', ')}
| EVAL container_value = ${containerValue},
       container = CONCAT(${POD_FIELD}, "/", ${CONTAINER_FIELD})
| INLINE STATS max_container_value = MAX(container_value)
  BY ${entityFields.join(', ')}
| WHERE container_value == max_container_value
| STATS value = MAX(container_value),
        worst_container = MIN(container)
  BY ${entityFields.join(', ')}
| KEEP ${[...entityFields, 'value', 'worst_container'].join(', ')}`;
};

/** Renders one stored measurement query with no time range or minute bucket. */
export const renderSignalQuery = ({
  esql,
  subtype,
  breakdown,
  template,
  variants,
}: {
  esql: string;
  subtype: string;
  breakdown: readonly string[];
  template: SignalTemplate;
  variants: readonly SignalTemplateVariant[];
}): { entityFields: string[]; esql: string } => {
  const workloadKind = WORKLOAD_KIND_BY_SUBTYPE[subtype];
  const additionalEntityFields = template.additionalEntityFields ?? [];
  const entityFields = workloadKind
    ? [CLUSTER_FIELD, 'kubernetes.namespace', 'workload']
    : [...breakdown, ...additionalEntityFields.map(({ name }) => name)];
  const workloadPipeline = workloadKind
    ? [
        WORKLOAD_OWNER_DERIVATION,
        `| WHERE kind == ${quoteEsqlString(workloadKind)}
    AND workload IS NOT NULL
    AND kubernetes.namespace IS NOT NULL`,
      ]
    : [];
  const aggregation =
    variants[0].formulaKind === 'container_average'
      ? renderContainerAggregation(variants, entityFields)
      : renderGenericAggregation({
          variants,
          entityFields,
          contextColumns: template.contextColumns,
          sampleColumn: template.hint.sample_column,
        });

  return {
    entityFields,
    esql: [
      `SET unmapped_fields = "NULLIFY"; ${toFromSourceQuery(esql)}`,
      `| WHERE ${buildVariantFilter(variants)}`,
      ...workloadPipeline,
      ...renderEntityFieldDerivations(additionalEntityFields),
      aggregation,
    ].join('\n'),
  };
};

/** Adds the preview time range, minute buckets, and row limit to a stored query. */
export const renderDefinitionPreviewQuery = (esql: string): string =>
  `${esql
    .replace(
      '| WHERE ',
      `| WHERE @timestamp >= NOW() - ${PREVIEW_WINDOW}
    AND `
    )
    .replaceAll('\n  BY ', '\n  BY minute = BUCKET(@timestamp, 1 minute), ')
    .replace('| KEEP ', '| KEEP minute, ')}
| LIMIT ${DEFINITION_PREVIEW_LIMIT}`;
