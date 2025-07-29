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
  ProductFeaturesConfigMap,
  ProductFeatureParams,
  ProductFeatureGroup,
} from '@kbn/security-solution-features';
import { ProductFeaturesConfigMerger } from './product_features_config_merger';

export class ProductFeatures {
  private featuresSetup?: FeaturesPluginSetup;
  private readonly productFeatures: Map<ProductFeatureGroup, ProductFeatureParams[]>;
  private readonly registeredActions: Set<string>;

  constructor(private readonly logger: Logger) {
    this.productFeatures = new Map();
    this.registeredActions = new Set();
  }

  public create<S extends string = string>(
    featureGroup: ProductFeatureGroup,
    params: Array<ProductFeatureParams<S>>
  ) {
    this.productFeatures.set(featureGroup, params);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public register<S extends string = string>(
    featureGroup: ProductFeatureGroup,
    productFeatureConfig: ProductFeaturesConfigMap<S>
  ) {
    if (this.featuresSetup == null) {
      throw new Error('Cannot register product features. Service not initialized.');
    }
    const productFeaturesGroup = this.productFeatures.get(featureGroup);
    if (!productFeaturesGroup) {
      throw new Error(`No product feature found for group: ${featureGroup}`);
    }

    for (const params of productFeaturesGroup) {
      const { baseKibanaFeature, baseKibanaSubFeatureIds, subFeaturesMap } = params;

      const featureConfigMerger = new ProductFeaturesConfigMerger(this.logger, subFeaturesMap);

      const completeProductFeatureConfig = featureConfigMerger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        baseKibanaSubFeatureIds,
        Array.from(productFeatureConfig.values())
      );

      this.featuresSetup.registerKibanaFeature(completeProductFeatureConfig);
      this.addRegisteredActions(completeProductFeatureConfig);
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
