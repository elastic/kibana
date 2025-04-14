/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaFeatureConfig,
  SubFeatureConfig,
  SubFeaturePrivilegeConfig,
} from '@kbn/features-plugin/common';
import type { RecursivePartial } from '@kbn/utility-types';
import type {
  ProductFeatureAssistantKey,
  ProductFeatureAttackDiscoveryKey,
  ProductFeatureCasesKey,
  ProductFeatureKeyType,
  ProductFeatureSecurityKey,
  AssistantSubFeatureId,
  CasesSubFeatureId,
  SecuritySubFeatureId,
  ProductFeatureSiemMigrationsKey,
  ProductFeatureTimelineFeatureKey,
  ProductFeatureNotesFeatureKey,
} from './product_features_keys';

export type { ProductFeatureKeyType };
export type ProductFeatureKeys = ProductFeatureKeyType[];

// Features types
export type BaseKibanaFeatureConfig = Omit<KibanaFeatureConfig, 'subFeatures'>;
export type SubFeaturesPrivileges = RecursivePartial<SubFeaturePrivilegeConfig>;
export type ProductFeatureKibanaConfig<T extends string = string> =
  RecursivePartial<BaseKibanaFeatureConfig> & {
    subFeatureIds?: T[];
    subFeaturesPrivileges?: SubFeaturesPrivileges[];
  };
export type ProductFeaturesConfig<T extends string = string> = Map<
  ProductFeatureKeyType,
  ProductFeatureKibanaConfig<T>
>;

export type ProductFeaturesSecurityConfig = Map<
  ProductFeatureSecurityKey,
  ProductFeatureKibanaConfig<SecuritySubFeatureId>
>;
export type ProductFeaturesCasesConfig = Map<
  ProductFeatureCasesKey,
  ProductFeatureKibanaConfig<CasesSubFeatureId>
>;

export type ProductFeaturesAssistantConfig = Map<
  ProductFeatureAssistantKey,
  ProductFeatureKibanaConfig<AssistantSubFeatureId>
>;

export type ProductFeaturesAttackDiscoveryConfig = Map<
  ProductFeatureAttackDiscoveryKey,
  ProductFeatureKibanaConfig
>;

export type ProductFeaturesTimelineConfig = Map<
  ProductFeatureTimelineFeatureKey,
  ProductFeatureKibanaConfig
>;

export type ProductFeaturesNotesConfig = Map<
  ProductFeatureNotesFeatureKey,
  ProductFeatureKibanaConfig
>;

export type ProductFeaturesSiemMigrationsConfig = Map<
  ProductFeatureSiemMigrationsKey,
  ProductFeatureKibanaConfig
>;

export type AppSubFeaturesMap<T extends string = string> = Map<T, SubFeatureConfig>;

export interface ProductFeatureParams<T extends string = string> {
  baseKibanaFeature: BaseKibanaFeatureConfig;
  baseKibanaSubFeatureIds: T[];
  subFeaturesMap: AppSubFeaturesMap<T>;
}

export interface ProductFeaturesConfigurator {
  security: () => ProductFeaturesConfig<SecuritySubFeatureId>;
  cases: () => ProductFeaturesConfig<CasesSubFeatureId>;
  securityAssistant: () => ProductFeaturesConfig<AssistantSubFeatureId>;
  attackDiscovery: () => ProductFeaturesConfig;
  timeline: () => ProductFeaturesConfig;
  notes: () => ProductFeaturesConfig;
  siemMigrations: () => ProductFeaturesConfig;
}
