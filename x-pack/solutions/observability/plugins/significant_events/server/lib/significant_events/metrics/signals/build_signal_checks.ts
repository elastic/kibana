/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
import type { SignalFieldPresence } from './check_signal_fields';
import { planSignalChecks } from './plan_signal_checks';
import { renderSignalQuery } from './render_signal_query';
import type { SignalCheck, SignalTemplate, SkippedSignal } from './types';

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

/** Builds runnable signal checks per type KI and explains every template that cannot run. */
export const buildSignalChecks = ({
  esql,
  typeKIs,
  templates,
  fieldPresence,
  fieldPresenceTruncated,
}: {
  esql: string;
  typeKIs: readonly MetricsTypeKnowledgeIndicator[];
  templates: readonly SignalTemplate[];
  fieldPresence: readonly SignalFieldPresence[];
  fieldPresenceTruncated: boolean;
}): { checks: SignalCheck[]; skipped: SkippedSignal[] } => {
  const checks: SignalCheck[] = [];
  const skipped: SkippedSignal[] = [];

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
          subtype: typeKI.subtype,
          reason,
        });
      if (breakdown.length === 0) {
        skip('The type KI has no breakdown fields.');
        continue;
      }
      const plans = planSignalChecks(template, fieldPresence, fieldPresenceTruncated);
      if (plans.length === 0) {
        skip('No ECS or OTel template field has data in the last hour.');
        continue;
      }

      for (const { variants, excludedClusters } of plans) {
        const [{ direction, comparison, threshold }] = variants;
        const { breakdown: resolvedBreakdown, esqlPreview } = renderSignalQuery({
          esql,
          subtype: typeKI.subtype,
          excludedClusters,
          breakdown,
          window: template.window,
          variants,
        });
        checks.push({
          signal: template.signal,
          type_ki_id: typeKI.id,
          subtype: typeKI.subtype,
          measurements: variants.map(({ schema, dataset, field, formula, source }) => ({
            schema,
            dataset,
            field,
            formula,
            source,
          })),
          ...(excludedClusters ? { excluded_clusters: excludedClusters } : {}),
          breakdown: resolvedBreakdown,
          window: template.window,
          direction,
          comparison,
          threshold,
          esql_preview: esqlPreview,
        });
      }
    }
  }

  return { checks, skipped };
};
