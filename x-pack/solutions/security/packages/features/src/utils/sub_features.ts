/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import type { AppSubFeaturesMap, MutableSubFeatureConfig, SubFeatureReplacement } from '../types';

/**
 * Adds the replacedBy entries to the subFeature's privileges.
 * It does not mutate the original subFeature.
 * @param subFeature - The subFeature to add replacements to
 * @param replacements - The replacements to add
 * @returns A new subFeature with the replacements added
 */
export const addSubFeatureReplacements = (
  subFeature: SubFeatureConfig,
  replacements: SubFeatureReplacement[]
): SubFeatureConfig => {
  if (!replacements.length) {
    return subFeature;
  }

  const subFeatureWithReplacement = cloneDeep(subFeature) as MutableSubFeatureConfig;

  subFeatureWithReplacement.privilegeGroups.forEach((privilegeGroup) => {
    privilegeGroup.privileges.forEach((privilege) => {
      privilege.replacedBy ??= [];
      for (const replacement of replacements) {
        const privileges = !replacement.removeOriginalPrivileges ? [privilege.id] : [];
        privileges.push(...(replacement.additionalPrivileges?.[privilege.id] ?? []));
        privilege.replacedBy.push({ feature: replacement.feature, privileges });
      }
    });
  });

  return subFeatureWithReplacement;
};

/**
 * Adds the replacements to all sub-features in the provided subFeaturesMap.
 * It does not mutate the original subFeaturesMap.
 * @param subFeaturesMap - The subFeaturesMap to add replacements to
 * @param replacements - The replacements to add
 * @returns A new subFeaturesMap with the replacements added
 */
export const addAllSubFeatureReplacements = <S extends string>(
  subFeaturesMap: AppSubFeaturesMap<S>,
  replacements: SubFeatureReplacement[]
): AppSubFeaturesMap<S> => {
  if (!replacements.length) {
    return subFeaturesMap;
  }
  return new Map(
    [...subFeaturesMap.entries()].map(([id, subFeature]) => {
      const subFeatureWithReplacement = addSubFeatureReplacements(subFeature, replacements);
      return [id, subFeatureWithReplacement];
    })
  );
};
