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
import type { RecursivePartial, RecursiveWritable } from '@kbn/utility-types';
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
  ProductFeatureTimelineKey,
  ProductFeatureNotesKey,
  ProductFeatureRulesKey,
} from './product_features_keys';

export type { ProductFeatureKeyType };
export type ProductFeatureKeys = ProductFeatureKeyType[];

// Features types
export type BaseKibanaFeatureConfig = Omit<KibanaFeatureConfig, 'subFeatures'>;
export type SubFeaturesPrivileges = RecursivePartial<SubFeaturePrivilegeConfig>;

export type MutableKibanaFeatureConfig = RecursiveWritable<KibanaFeatureConfig>;
export type MutableSubFeatureConfig = RecursiveWritable<SubFeatureConfig>;

export type FeatureConfigModifier = (config: MutableKibanaFeatureConfig) => void;

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
     * Functions to apply free modifications to the resulting Kibana feature config when a specific ProductFeatureKey is enabled.
     * The `kibanaFeatureConfig` object received is a deep copy of the original configuration, it can be mutated safely.
     * The modifications are applied after merging the configs of all the ProductFeatureKeys, it includes the final `subFeatures` array.
     *
     * @param kibanaFeatureConfig to be mutated
     * @returns void
     */
    featureConfigModifiers?: FeatureConfigModifier[];
  };

/**
 * App features privileges configuration for the Security Solution Kibana Feature app.
 * These are the configs that are shared between both offering types (ess and serverless).
 * They can be extended on each offering plugin to register privileges using different way on each offering type.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 * - `featureConfigModifiers`: functions to apply free modifications to the resulting Kibana feature config when a specific ProductFeatureKey is enabled.
 */
export type ProductFeaturesConfig<
  K extends ProductFeatureKeyType = ProductFeatureKeyType,
  T extends string = string
> = Partial<Record<K, ProductFeatureKibanaConfig<T>>>;

export type SecurityProductFeaturesConfig = ProductFeaturesConfig<
  ProductFeatureSecurityKey,
  SecuritySubFeatureId
>;
export type CasesProductFeaturesConfig = ProductFeaturesConfig<
  ProductFeatureCasesKey,
  CasesSubFeatureId
>;
export type AssistantProductFeaturesConfig = ProductFeaturesConfig<
  ProductFeatureAssistantKey,
  AssistantSubFeatureId
>;
export type AttackDiscoveryProductFeaturesConfig =
  ProductFeaturesConfig<ProductFeatureAttackDiscoveryKey>;
export type TimelineProductFeaturesConfig = ProductFeaturesConfig<ProductFeatureTimelineKey>;
export type NotesProductFeaturesConfig = ProductFeaturesConfig<ProductFeatureNotesKey>;
export type SiemMigrationsProductFeaturesConfig =
  ProductFeaturesConfig<ProductFeatureSiemMigrationsKey>;
export type RulesProductFeaturesConfig = ProductFeaturesConfig<ProductFeatureRulesKey>;

export type AppSubFeaturesMap<T extends string = string> = Map<T, SubFeatureConfig>;

export interface ProductFeatureParams<
  K extends ProductFeatureKeyType = ProductFeatureKeyType,
  S extends string = string
> {
  baseKibanaFeature: BaseKibanaFeatureConfig;
  baseKibanaSubFeatureIds?: S[];
  subFeaturesMap?: AppSubFeaturesMap<S>;
  productFeatureConfig?: ProductFeaturesConfig<K, S>;
}

export interface ConfigExtensions<C extends ProductFeaturesConfig> {
  /** The `allVersions` is used to extend all the versions of the feature group */
  allVersions: C;
  /** The `version` object indexed by the feature `id` */
  version: Record<string, C>;
}

interface ProductFeatureConfigExtensions {
  security: ConfigExtensions<SecurityProductFeaturesConfig>;
  cases: ConfigExtensions<CasesProductFeaturesConfig>;
  securityAssistant: ConfigExtensions<AssistantProductFeaturesConfig>;
  attackDiscovery: ConfigExtensions<AttackDiscoveryProductFeaturesConfig>;
  timeline: ConfigExtensions<TimelineProductFeaturesConfig>;
  notes: ConfigExtensions<NotesProductFeaturesConfig>;
  siemMigrations: ConfigExtensions<SiemMigrationsProductFeaturesConfig>;
  rules: ConfigExtensions<RulesProductFeaturesConfig>;
}

export type ProductFeaturesConfiguratorExtensions = Partial<ProductFeatureConfigExtensions>;

export interface ProductFeaturesConfigurator {
  enabledProductFeatureKeys: ProductFeatureKeyType[];
  extensions?: ProductFeaturesConfiguratorExtensions;
}

export type ProductFeatureGroup = keyof ProductFeatureConfigExtensions;

export interface SubFeatureReplacement {
  /** The (top-level) feature id that will replace the sub-feature */
  feature: string;
  /** If true, the additional privileges will be added to the replacedBy array */
  additionalPrivileges?: Record<string, string[]>;
  /** If true, the current privilege id will not be copied to the replacedBy array.
   * This is useful for discontinuing a sub-feature privilege, e.g. when splitting
   * the sub-feature into two or just removing it.
   */
  removeOriginalPrivileges?: boolean;
}
export type SubFeatureReplacements = SubFeatureReplacement[];
