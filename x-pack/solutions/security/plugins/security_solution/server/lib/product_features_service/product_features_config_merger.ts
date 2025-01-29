/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isArray, mergeWith, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';
import type {
  ProductFeatureKibanaConfig,
  BaseKibanaFeatureConfig,
  SubFeaturesPrivileges,
} from '@kbn/security-solution-features';

export class ProductFeaturesConfigMerger<T extends string = string> {
  constructor(
    private readonly logger: Logger,
    private readonly subFeaturesMap: Map<T, SubFeatureConfig>
  ) {}

  /**
   * Merges `productFeaturesConfigs` into `kibanaFeatureConfig`.
   * @param kibanaFeatureConfig the KibanaFeatureConfig to merge into
   * @param kibanaSubFeatureIds
   * @param productFeaturesConfigs the ProductFeatureKibanaConfig to merge
   * @returns mergedKibanaFeatureConfig the merged KibanaFeatureConfig
   * */
  public mergeProductFeatureConfigs(
    kibanaFeatureConfig: BaseKibanaFeatureConfig,
    kibanaSubFeatureIds: T[],
    productFeaturesConfigs: ProductFeatureKibanaConfig[]
  ): KibanaFeatureConfig {
    const mergedKibanaFeatureConfig = cloneDeep(kibanaFeatureConfig) as KibanaFeatureConfig;
    const subFeaturesPrivilegesToMerge: SubFeaturesPrivileges[] = [];
    const enabledSubFeaturesIndexed = Object.fromEntries(
      kibanaSubFeatureIds.map((id) => [id, true])
    );

    productFeaturesConfigs.forEach((productFeatureConfig) => {
      const { subFeaturesPrivileges, subFeatureIds, ...productFeatureConfigToMerge } =
        cloneDeep(productFeatureConfig);

      subFeatureIds?.forEach((subFeatureId) => {
        enabledSubFeaturesIndexed[subFeatureId] = true;
      });

      if (subFeaturesPrivileges) {
        subFeaturesPrivilegesToMerge.push(...subFeaturesPrivileges);
      }
      mergeWith(mergedKibanaFeatureConfig, productFeatureConfigToMerge, featureConfigMerger);
    });

    // generate sub features configs from enabled sub feature ids, preserving map order
    const mergedKibanaSubFeatures: SubFeatureConfig[] = [];
    this.subFeaturesMap.forEach((subFeature, id) => {
      if (enabledSubFeaturesIndexed[id]) {
        mergedKibanaSubFeatures.push(cloneDeep(subFeature));
      }
    });

    // add extra privileges to subFeatures
    subFeaturesPrivilegesToMerge.forEach((subFeaturesPrivileges) => {
      this.mergeSubFeaturesPrivileges(mergedKibanaSubFeatures, subFeaturesPrivileges);
    });

    mergedKibanaFeatureConfig.subFeatures = mergedKibanaSubFeatures;

    return mergedKibanaFeatureConfig;
  }

  /**
   * Merges `subFeaturesPrivileges` into `kibanaFeatureConfig.subFeatures` by finding the subFeature privilege id.
   * @param subFeatures the subFeatures to merge into
   * @param subFeaturesPrivileges the subFeaturesPrivileges to merge
   * @returns void
   * */
  private mergeSubFeaturesPrivileges(
    subFeatures: SubFeatureConfig[],
    subFeaturesPrivileges: SubFeaturesPrivileges
  ): void {
    const merged = subFeatures.find(({ privilegeGroups }) =>
      privilegeGroups.some(({ privileges }) => {
        const subFeaturePrivilegeToUpdate = privileges.find(
          ({ id }) => id === subFeaturesPrivileges.id
        );
        if (subFeaturePrivilegeToUpdate) {
          mergeWith(subFeaturePrivilegeToUpdate, subFeaturesPrivileges, featureConfigMerger);
          return true;
        }
        return false;
      })
    );
    if (!merged) {
      this.logger.warn(
        `Trying to merge subFeaturesPrivileges ${subFeaturesPrivileges.id} but the subFeature privilege was not found`
      );
    }
  }
}

/**
 * The customizer used by lodash.mergeWith to merge deep objects
 * Uses concatenation for arrays and removes duplicates, objects are merged using lodash.mergeWith default behavior
 * */
function featureConfigMerger(objValue: unknown, srcValue: unknown) {
  if (isArray(srcValue)) {
    if (isArray(objValue)) {
      return uniq(objValue.concat(srcValue));
    }
    return srcValue;
  }
}
