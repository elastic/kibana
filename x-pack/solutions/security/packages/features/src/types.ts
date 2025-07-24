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

export type FeatureConfigModifier = (baseFeatureConfig: BaseKibanaFeatureConfig) => void;

export type ProductFeatureKibanaConfig<T extends string = string> =
  RecursivePartial<BaseKibanaFeatureConfig> & {
    /**
     * List of sub-feature IDs that will be added into the Security subFeatures entry.
     */
    subFeatureIds?: T[];

    /**
     * List of additional privileges that will be merged into existing Security subFeature with the privilege `id` specified.
     */
    subFeaturesPrivileges?: SubFeaturesPrivileges[];

    /**
     * Function to apply free modifications to the resulting Kibana feature config when a specific ProductFeatureKey is enabled.
     * The `kibanaFeatureConfig` object received is a deep copy of the original configuration, it can be mutated safely.
     * The modifications are applied after merging the configs of all the ProductFeatureKeys, it includes the final `subFeatures` array.
     *
     * @param kibanaFeatureConfig to be mutated
     * @returns void
     */
    featureConfigModifier?: FeatureConfigModifier;
  };

export type ProductFeaturesConfig<
  K extends ProductFeatureKeyType,
  T extends string = string
> = Partial<Record<K, ProductFeatureKibanaConfig<T>>>;

export type ProductFeaturesConfigMap<T extends string = string> = Map<
  ProductFeatureKeyType,
  ProductFeatureKibanaConfig<T>
>;

export type SecurityProductFeaturesConfigMap = Map<
  ProductFeatureSecurityKey,
  ProductFeatureKibanaConfig<SecuritySubFeatureId>
>;
export type CasesProductFeaturesConfigMap = Map<
  ProductFeatureCasesKey,
  ProductFeatureKibanaConfig<CasesSubFeatureId>
>;

export type AssistantProductFeaturesConfigMap = Map<
  ProductFeatureAssistantKey,
  ProductFeatureKibanaConfig<AssistantSubFeatureId>
>;

export type AttackDiscoveryProductFeaturesConfigMap = Map<
  ProductFeatureAttackDiscoveryKey,
  ProductFeatureKibanaConfig
>;

export type TimelineProductFeaturesConfigMap = Map<
  ProductFeatureTimelineFeatureKey,
  ProductFeatureKibanaConfig
>;

export type NotesProductFeaturesConfigMap = Map<
  ProductFeatureNotesFeatureKey,
  ProductFeatureKibanaConfig
>;

export type SiemMigrationsProductFeaturesConfigMap = Map<
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
  security: () => SecurityProductFeaturesConfigMap;
  cases: () => CasesProductFeaturesConfigMap;
  securityAssistant: () => AssistantProductFeaturesConfigMap;
  attackDiscovery: () => AttackDiscoveryProductFeaturesConfigMap;
  timeline: () => TimelineProductFeaturesConfigMap;
  notes: () => NotesProductFeaturesConfigMap;
  siemMigrations: () => SiemMigrationsProductFeaturesConfigMap;
}
