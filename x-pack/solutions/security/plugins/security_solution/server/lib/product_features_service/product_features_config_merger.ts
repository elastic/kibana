/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, mergeWith } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';
import type {
  ProductFeatureKibanaConfig,
  BaseKibanaFeatureConfig,
  SubFeaturesPrivileges,
  FeatureConfigModifier,
  MutableKibanaFeatureConfig,
  MutableSubFeatureConfig,
} from '@kbn/security-solution-features';
import { featureConfigMerger } from '@kbn/security-solution-features/utils';

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
    const mergedKibanaFeatureConfig = cloneDeep(kibanaFeatureConfig) as MutableKibanaFeatureConfig;

    const enabledSubFeaturesIndexed = Object.fromEntries(
      kibanaSubFeatureIds.map((id) => [id, true])
    );
    const subFeaturesPrivilegesToMerge: SubFeaturesPrivileges[] = [];
    const allFeatureConfigModifiers: FeatureConfigModifier[] = [];

    productFeaturesConfigs.forEach((productFeatureConfig) => {
      const {
        subFeaturesPrivileges,
        subFeatureIds,
        featureConfigModifiers,
        ...productFeatureConfigToMerge
      } = productFeatureConfig;

      subFeatureIds?.forEach((subFeatureId) => {
        enabledSubFeaturesIndexed[subFeatureId] = true;
      });

      if (subFeaturesPrivileges) {
        subFeaturesPrivilegesToMerge.push(...subFeaturesPrivileges);
      }

      if (featureConfigModifiers) {
        allFeatureConfigModifiers.push(...featureConfigModifiers);
      }

      mergeWith(mergedKibanaFeatureConfig, productFeatureConfigToMerge, featureConfigMerger);
    });

    // generate sub features configs from enabled sub feature ids, preserving map order
    const mergedKibanaSubFeatures: MutableSubFeatureConfig[] = [];
    this.subFeaturesMap.forEach((subFeature, id) => {
      if (enabledSubFeaturesIndexed[id]) {
        mergedKibanaSubFeatures.push(cloneDeep(subFeature) as MutableSubFeatureConfig);
      }
    });

    // add extra privileges to subFeatures
    subFeaturesPrivilegesToMerge.forEach((subFeaturesPrivileges) => {
      this.mergeSubFeaturesPrivileges(mergedKibanaSubFeatures, subFeaturesPrivileges);
    });

    mergedKibanaFeatureConfig.subFeatures = mergedKibanaSubFeatures;

    // Apply custom modifications after merging all the product feature configs, including the subFeatures
    allFeatureConfigModifiers.forEach((modifier) => {
      modifier(mergedKibanaFeatureConfig);
    });

    return Object.freeze(mergedKibanaFeatureConfig) as KibanaFeatureConfig;
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
