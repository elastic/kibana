/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  ProductFeatureKeyType,
  ProductFeaturesConfigurator,
} from '@kbn/security-solution-features';
import {
  getAssistantFeature,
  getAttackDiscoveryFeature,
  getCasesFeature,
  getSecurityFeature,
  getCasesV2Feature,
  getCasesV3Feature,
  getSecurityV2Feature,
  getSecurityV3Feature,
  getSecurityV4Feature,
  getSecurityV5Feature,
  getTimelineFeature,
  getNotesFeature,
  getSiemMigrationsFeature,
  getRulesV2Feature,
  getRulesFeature,
} from '@kbn/security-solution-features/product_features';
import { API_ACTION_PREFIX } from '@kbn/security-solution-features/actions';
import type { ExperimentalFeatures } from '../../../common';
import { ProductFeatures } from './product_features';
import { casesProductFeatureParams } from './cases_product_feature_params';
import {
  rulesSavedObjects,
  rulesV2SavedObjects,
  securityExceptionsSavedObjects,
  securityNotesSavedObjects,
  securityTimelineSavedObjects,
  securityV1SavedObjects,
  securityV2SavedObjects,
  securityV3SavedObjects,
  securityV4SavedObjects,
  securityV5SavedObjects,
} from './security_saved_objects';
import { registerApiAccessControl } from './product_features_api_access_control';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../plugin_contract';

export class ProductFeaturesService {
  public readonly logger: Logger;
  private productFeaturesRegistry: ProductFeatures;
  private enabledProductFeatures?: Set<ProductFeatureKeyType>;

  constructor(loggerFactory: Logger, experimentalFeatures: ExperimentalFeatures) {
    this.logger = loggerFactory.get('productFeaturesService');
    this.productFeaturesRegistry = new ProductFeatures(this.logger);

    const securityFeatureParams = { experimentalFeatures };
    this.productFeaturesRegistry.create('security', [
      getSecurityFeature({ ...securityFeatureParams, savedObjects: securityV1SavedObjects }),
      getSecurityV2Feature({ ...securityFeatureParams, savedObjects: securityV2SavedObjects }),
      getSecurityV3Feature({ ...securityFeatureParams, savedObjects: securityV3SavedObjects }),
      getSecurityV4Feature({ ...securityFeatureParams, savedObjects: securityV4SavedObjects }),
      getSecurityV5Feature({ ...securityFeatureParams, savedObjects: securityV5SavedObjects }),
    ]);
    this.productFeaturesRegistry.create('cases', [
      getCasesFeature(casesProductFeatureParams),
      getCasesV2Feature(casesProductFeatureParams),
      getCasesV3Feature(casesProductFeatureParams),
    ]);
    this.productFeaturesRegistry.create('securityAssistant', [
      getAssistantFeature(experimentalFeatures),
    ]);
    this.productFeaturesRegistry.create('attackDiscovery', [
      getAttackDiscoveryFeature(experimentalFeatures),
    ]);
    this.productFeaturesRegistry.create('timeline', [
      getTimelineFeature({ ...securityFeatureParams, savedObjects: securityTimelineSavedObjects }),
    ]);
    this.productFeaturesRegistry.create('notes', [
      getNotesFeature({ ...securityFeatureParams, savedObjects: securityNotesSavedObjects }),
    ]);
    this.productFeaturesRegistry.create('rules', [
      getRulesFeature({ ...securityFeatureParams, savedObjects: rulesSavedObjects }),
      getRulesV2Feature({
        ...securityFeatureParams,
        savedObjects: [...rulesV2SavedObjects, ...securityExceptionsSavedObjects],
      }),
    ]);
    if (!experimentalFeatures.siemMigrationsDisabled) {
      this.productFeaturesRegistry.create('siemMigrations', [getSiemMigrationsFeature()]);
    }
  }

  /** Initializes the features plugin setup */
  public setup(
    core: SecuritySolutionPluginCoreSetupDependencies,
    plugins: SecuritySolutionPluginSetupDependencies
  ) {
    this.productFeaturesRegistry.init(plugins.features);
    registerApiAccessControl(this, core.http);
  }

  /** Merges configurations of all the product features and registers them as Kibana features */
  public setProductFeaturesConfigurator(configurator: ProductFeaturesConfigurator) {
    const { enabledProductFeatureKeys, extensions } = configurator;
    this.logger.debug(`Registering product features: ${enabledProductFeatureKeys.join(', ')}`);

    this.productFeaturesRegistry.register(enabledProductFeatureKeys, extensions);

    this.enabledProductFeatures = new Set<ProductFeatureKeyType>(enabledProductFeatureKeys);
  }

  /** Function to check if a specific product feature key is enabled */
  public isEnabled(productFeatureKey: ProductFeatureKeyType): boolean {
    if (!this.enabledProductFeatures) {
      throw new Error('ProductFeatures has not yet been configured');
    }
    return this.enabledProductFeatures.has(productFeatureKey);
  }

  /** Function to check if a specific privilege action has been registered in the Kibana features */
  public isActionRegistered(action: string) {
    return this.productFeaturesRegistry.isActionRegistered(action);
  }

  /** Function to get the correct API action name for a specific api privilege */
  public getApiActionName = (apiPrivilege: string) => `api:${API_ACTION_PREFIX}${apiPrivilege}`;
}
