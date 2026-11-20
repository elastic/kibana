/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type { SignalFieldPresence } from './check_signal_fields';
import { getSignalVariantFields } from './types';
import type { SignalFormulaKind, SignalTemplate, SignalTemplateVariant } from './types';

export const CLUSTER_FIELD = 'orchestrator.cluster.name';

// Averages can be computed per schema side by side and merged by preference in one query.
const MERGEABLE_KINDS: ReadonlySet<SignalFormulaKind> = new Set([
  'average',
  'inverse_average',
  'container_average',
]);

export interface SignalCheckPlan {
  /** Variants in preference order, OpenTelemetry first. */
  variants: SignalTemplateVariant[];
  scope?: Condition;
}

const hasVariantFields = (presence: SignalFieldPresence, variant: SignalTemplateVariant): boolean =>
  presence.dataset === variant.dataset &&
  getSignalVariantFields(variant).every((field) => presence.fields.has(field));

const byPreference = (left: SignalTemplateVariant, right: SignalTemplateVariant): number =>
  Number(right.schema === 'otel') - Number(left.schema === 'otel');

const canMergePerEntity = ([first, ...rest]: readonly SignalTemplateVariant[]): boolean =>
  MERGEABLE_KINDS.has(first.formulaKind) &&
  rest.every(
    (variant) =>
      MERGEABLE_KINDS.has(variant.formulaKind) &&
      (variant.formulaKind === 'container_average') ===
        (first.formulaKind === 'container_average') &&
      variant.comparison === first.comparison &&
      variant.threshold === first.threshold &&
      variant.minimumSampleCount === first.minimumSampleCount
  );

/** Picks one variant per cluster, OpenTelemetry first, and returns the clusters each variant won. */
const assignVariantsToClusters = (
  variants: readonly SignalTemplateVariant[],
  fieldPresence: readonly SignalFieldPresence[]
): Array<{ variant: SignalTemplateVariant; clusters: Array<string | undefined> }> => {
  const clustersByVariant = new Map<SignalTemplateVariant, Array<string | undefined>>();
  for (const cluster of new Set(fieldPresence.map((presence) => presence.cluster))) {
    const variant = variants.find((candidate) =>
      fieldPresence.some(
        (presence) => presence.cluster === cluster && hasVariantFields(presence, candidate)
      )
    );
    if (variant) {
      clustersByVariant.set(variant, [...(clustersByVariant.get(variant) ?? []), cluster]);
    }
  }
  return variants.flatMap((variant) => {
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

/**
 * Plans the checks for one template from the fields that have data.
 * Averages become one check that prefers OpenTelemetry per entity, so an entity reporting
 * only one schema is never dropped. Other formulas cannot be merged in one query; they get
 * one check per variant, and a later variant excludes the clusters an earlier one covers.
 */
export const planSignalChecks = (
  template: SignalTemplate,
  fieldPresence: readonly SignalFieldPresence[]
): SignalCheckPlan[] => {
  const variants = [...template.variants]
    .sort(byPreference)
    .filter((variant) => fieldPresence.some((presence) => hasVariantFields(presence, variant)));
  if (variants.length === 0) {
    return [];
  }
  if (canMergePerEntity(variants)) {
    return [{ variants }];
  }

  const assignments = assignVariantsToClusters(variants, fieldPresence);
  return assignments.map(({ variant }, index) => {
    const scope = buildClusterExclusion(
      assignments.slice(0, index).flatMap(({ clusters }) => clusters)
    );
    return { variants: [variant], ...(scope ? { scope } : {}) };
  });
};
