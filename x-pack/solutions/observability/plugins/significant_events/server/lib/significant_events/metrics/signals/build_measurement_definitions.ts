/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
import type { SignalFieldPresence } from './check_signal_fields';
import { planMeasurementDefinition } from './plan_measurement_definitions';
import { renderSignalQuery } from './render_signal_query';
import type { MeasurementDefinition, SignalTemplate, SkippedMeasurementDefinition } from './types';

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

const getBreakdown = ({ properties }: MetricsTypeKnowledgeIndicator): string[] => {
  const { breakdown } = properties;
  return Array.isArray(breakdown) &&
    breakdown.every((field): field is string => typeof field === 'string')
    ? breakdown
    : [];
};

/** Builds one runnable measurement definition per type KI and signal. */
export const buildMeasurementDefinitions = ({
  esql,
  typeKIs,
  templates,
  fieldPresence,
}: {
  esql: string;
  typeKIs: readonly MetricsTypeKnowledgeIndicator[];
  templates: readonly SignalTemplate[];
  fieldPresence: readonly SignalFieldPresence[];
}): {
  definitions: MeasurementDefinition[];
  skipped: SkippedMeasurementDefinition[];
} => {
  const definitions: MeasurementDefinition[] = [];
  const skipped: SkippedMeasurementDefinition[] = [];

  for (const typeKI of typeKIs) {
    const breakdown = getBreakdown(typeKI);
    const applicableTemplates = templates.filter(({ subtypes }) =>
      subtypes.includes(typeKI.subtype)
    );
    for (const template of applicableTemplates) {
      const skip = (reason: string) =>
        skipped.push({
          signal: template.signal,
          type_ki_id: typeKI.id,
          entity_type: typeKI.subtype,
          reason,
        });
      if (breakdown.length === 0) {
        skip('The type KI has no breakdown fields.');
        continue;
      }
      const plan = planMeasurementDefinition(template, fieldPresence);
      if (!plan) {
        skip('No ECS or OTel template field has data in the last hour.');
        continue;
      }

      const { variants } = plan;
      const { entityFields, esql: definitionEsql } = renderSignalQuery({
        esql,
        subtype: typeKI.subtype,
        breakdown,
        template,
        variants,
      });
      definitions.push({
        signal: template.signal,
        type_ki_id: typeKI.id,
        entity_type: typeKI.subtype,
        entity_fields: entityFields,
        metric_type: template.metricType,
        unit: template.unit,
        value_column: 'value',
        context_columns: [...template.contextColumns],
        esql: definitionEsql,
        hint: { ...template.hint, source: variants[0].source },
        measurements: variants.map(({ schema, dataset, field, formula, source }) => ({
          schema,
          dataset,
          field,
          formula,
          source,
        })),
      });
    }
  }

  return { definitions, skipped };
};
