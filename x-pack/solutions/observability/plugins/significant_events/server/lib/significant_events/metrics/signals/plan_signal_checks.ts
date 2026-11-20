/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalFieldPresence } from './check_signal_fields';
import { getSignalVariantFields, getSignalVariantPreferredFields } from './types';
import type {
  SignalClusterExclusion,
  SignalFormulaKind,
  SignalTemplate,
  SignalTemplateVariant,
} from './types';

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
  excludedClusters?: SignalClusterExclusion;
}

const hasVariantFields = (presence: SignalFieldPresence, variant: SignalTemplateVariant): boolean =>
  presence.dataset === variant.dataset &&
  getSignalVariantFields(variant).every((field) => presence.fields.has(field));

const hasVariantPreferredFields = (
  presence: SignalFieldPresence,
  variant: SignalTemplateVariant
): boolean => getSignalVariantPreferredFields(variant).every((field) => presence.fields.has(field));

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

/** Picks one variant per named cluster, OpenTelemetry first, and keeps unclustered variants. */
const assignVariantsToClusters = (
  variants: readonly SignalTemplateVariant[],
  fieldPresence: readonly SignalFieldPresence[]
): Array<{ variant: SignalTemplateVariant; clusters: string[] }> => {
  const clustersByVariant = new Map<SignalTemplateVariant, string[]>();
  for (const cluster of new Set(fieldPresence.map((presence) => presence.cluster))) {
    if (cluster === undefined) {
      // Rows without a cluster stay in every check; choosing per entity at run time is planned for the follow up PR.
      for (const variant of variants) {
        if (
          fieldPresence.some(
            (presence) => presence.cluster === undefined && hasVariantFields(presence, variant)
          )
        ) {
          clustersByVariant.set(variant, clustersByVariant.get(variant) ?? []);
        }
      }
      continue;
    }
    // Prefer complete signal context, then fall back to the fields required to run.
    const variant =
      variants.find((candidate) =>
        fieldPresence.some(
          (presence) =>
            presence.cluster === cluster &&
            hasVariantFields(presence, candidate) &&
            hasVariantPreferredFields(presence, candidate)
        )
      ) ??
      variants.find((candidate) =>
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

const buildClusterExclusion = (clusters: readonly string[]): SignalClusterExclusion | undefined => {
  if (clusters.length === 0) {
    return undefined;
  }
  return { names: [...clusters] };
};

/**
 * Plans the checks for one template from the fields that have data.
 * Averages become one check that prefers OpenTelemetry per entity, so an entity reporting
 * only one schema is never dropped. Other formulas cannot be merged in one query; they get
 * one check per variant, and each variant excludes clusters won by every other variant.
 */
export const planSignalChecks = (
  template: SignalTemplate,
  fieldPresence: readonly SignalFieldPresence[],
  fieldPresenceTruncated: boolean
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
  if (fieldPresenceTruncated) {
    return variants.map((variant) => ({ variants: [variant] }));
  }

  const assignments = assignVariantsToClusters(variants, fieldPresence);
  // Each variant excludes every cluster won by another variant.
  return assignments.map((assignment) => {
    const excludedClusters = buildClusterExclusion(
      assignments.filter((other) => other !== assignment).flatMap(({ clusters }) => clusters)
    );
    return {
      variants: [assignment.variant],
      ...(excludedClusters ? { excludedClusters } : {}),
    };
  });
};
