/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  FeatureKibanaPrivileges,
  KibanaFeatureConfig,
  FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type {
  ProductFeatureParams,
  ProductFeatureGroup,
  ProductFeatureKeyType,
  ProductFeaturesConfiguratorExtensions,
  ProductFeatureKibanaConfig,
} from '@kbn/security-solution-features';
import { extendProductFeatureConfigs } from '@kbn/security-solution-features/utils';
import { ProductFeaturesConfigMerger } from './product_features_config_merger';

export class ProductFeatures {
  private featuresSetup?: FeaturesPluginSetup;
  private readonly groupVersions: Map<ProductFeatureGroup, ProductFeatureParams[]>;
  private readonly registeredActions: Set<string>;

  constructor(private readonly logger: Logger) {
    this.groupVersions = new Map();
    this.registeredActions = new Set();
  }

  public create(featureGroup: ProductFeatureGroup, versions: ProductFeatureParams[]) {
    this.groupVersions.set(featureGroup, versions);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public register(
    enabledProductFeatureKeys: ProductFeatureKeyType[],
    extensions: ProductFeaturesConfiguratorExtensions = {}
  ) {
    if (this.featuresSetup == null) {
      throw new Error('Cannot register product features. Service not initialized.');
    }

    const enabledKeys = new Set(enabledProductFeatureKeys);

    for (const [featureGroup, featureGroupVersions] of this.groupVersions.entries()) {
      const { allVersions: allVersionsExtensions = {}, version: versionsExtensions = {} } =
        extensions[featureGroup] ?? {};

      for (const featureVersion of featureGroupVersions) {
        const versionExtensions = versionsExtensions[featureVersion.baseKibanaFeature.id] ?? {};

        const extendedConfig = extendProductFeatureConfigs<ProductFeatureKeyType, string>(
          featureVersion.productFeatureConfig ?? {},
          allVersionsExtensions,
          versionExtensions
        );

        // Filter to include only the configs of enabled keys
        const filteredConfig = Object.entries(extendedConfig).reduce<ProductFeatureKibanaConfig[]>(
          (acc, [key, value]) => {
            if (enabledKeys.has(key as ProductFeatureKeyType)) {
              acc.push(value);
            }
            return acc;
          },
          []
        );

        const featureConfigMerger = new ProductFeaturesConfigMerger(
          this.logger,
          featureVersion.subFeaturesMap ?? new Map()
        );

        const completeProductFeatureConfig = featureConfigMerger.mergeProductFeatureConfigs(
          featureVersion.baseKibanaFeature,
          featureVersion.baseKibanaSubFeatureIds ?? [],
          filteredConfig
        );

        this.featuresSetup.registerKibanaFeature(completeProductFeatureConfig);
        this.addRegisteredActions(completeProductFeatureConfig);
      }
    }
  }

  private addRegisteredActions(config: KibanaFeatureConfig) {
    const privileges: FeatureKibanaPrivileges[] = [];

    // get main privileges
    if (config.privileges?.all) {
      privileges.push(config.privileges?.all);
    }
    if (config.privileges?.read) {
      privileges.push(config.privileges?.read);
    }

    // get sub features privileges
    config.subFeatures?.forEach((subFeature) => {
      subFeature.privilegeGroups.forEach((privilegeGroup) => {
        privilegeGroup.privileges.forEach((privilege) => {
          privileges.push(privilege);
        });
      });
    });

    // add the actions from all the registered privileges
    privileges.forEach((privilege) => {
      privilege.api?.forEach((apiAction) => {
        this.registeredActions.add(`api:${apiAction}`);
      });
      privilege.ui?.forEach((uiAction) => {
        this.registeredActions.add(`ui:${uiAction}`);
      });
    });
  }

  public isActionRegistered(action: string) {
    return this.registeredActions.has(action);
  }
}
