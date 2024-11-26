/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as AlertingPluginsSetup } from '@kbn/alerting-plugin/server/plugin';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin, PluginInitializer } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';

import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  alerting: AlertingPluginsSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
}

export const plugin: PluginInitializer<void, void> = async (): Promise<
  Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>
> => ({
  setup: (core: CoreSetup<PluginStartDependencies>, deps: PluginSetupDependencies) => {
    // Case #1: feature A needs to be renamed to feature B. It's unfortunate, but the existing feature A
    // should be deprecated and re-created as a new feature with the same privileges.
    case1FeatureRename(deps);

    // Case #2: feature A needs to be split into two separate features B and C. In this case we mark
    // feature as deprecated and create two new features.
    case2FeatureSplit(deps);

    // Case #3: feature A grants access to Saved Object types `one` and `two` via top-level `all`
    // and `read` privileges. The requirement is to not grant access to `two` via top-level
    // privileges, and instead use sub-feature privilege for that.
    case3FeatureSplitSubFeature(deps);

    // Case #4: features A (`case_4_feature_a`) and B (`case_4_feature_b`) grant access to the saved object type `ab`.
    // The requirement is to introduce a new feature C (`case_4_feature_c) that will grant access to `ab`, and remove
    // this privilege from feature A and B. Here's what we'll have as the result:
    // * `case_4_feature_a` (existing, deprecated)
    // * `case_4_feature_b` (existing, deprecated)
    // * `case_4_feature_a_v2` (new, decoupled from `ab` SO, partially replaces `case_4_feature_a`)
    // * `case_4_feature_b_v2` (new, decoupled from `ab` SO, partially replaces `case_4_feature_b`)
    // * `case_4_feature_c` (new, only for `ab` SO access)
    case4FeatureExtract(deps);

    initRoutes(core);
  },
  start: () => {},
  stop: () => {},
});

function case1FeatureRename(deps: PluginSetupDependencies) {
  // Step 1: extract a part of the feature definition that will be shared between deprecated and new
  // features.
  const commonFeatureDefinition = {
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: {
      all: { savedObject: { all: ['one'], read: [] }, ui: ['ui_all'] },
      read: { savedObject: { all: [], read: ['one'] }, ui: ['ui_read'] },
    },
    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],
  };

  // Step 2: mark feature A as deprecated and provide proper replacements for all feature and
  // sub-feature privileges.
  deps.features.registerKibanaFeature({
    ...commonFeatureDefinition,
    deprecated: { notice: 'Case #1 is deprecated.' },
    id: 'case_1_feature_a',
    name: 'Case #1 feature A (DEPRECATED)',
    privileges: {
      all: {
        ...commonFeatureDefinition.privileges.all,
        replacedBy: [{ feature: 'case_1_feature_b', privileges: ['all'] }],
      },
      read: {
        ...commonFeatureDefinition.privileges.read,
        replacedBy: [{ feature: 'case_1_feature_b', privileges: ['read'] }],
      },
    },
  });

  // Step 3: define a new feature with exactly same privileges.
  deps.features.registerKibanaFeature({
    ...commonFeatureDefinition,
    id: 'case_1_feature_b',
    name: 'Case #1 feature B',
  });
}

function case2FeatureSplit(deps: PluginSetupDependencies) {
  // Step 1: mark feature A as deprecated and provide proper replacements for all feature and
  // sub-feature privileges.
  deps.features.registerKibanaFeature({
    deprecated: { notice: 'Case #2 is deprecated.' },

    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    app: ['app_one', 'app_two'],
    catalogue: ['cat_one', 'cat_two'],
    management: { kibana: ['management_one', 'management_two'] },
    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_2_feature_a',
    name: 'Case #2 feature A (DEPRECATED)',
    alerting: ['alerting_rule_type_one', 'alerting_rule_type_two'],
    cases: ['cases_owner_one', 'cases_owner_two'],
    privileges: {
      all: {
        savedObject: { all: ['one', 'two'], read: [] },
        ui: ['ui_all_one', 'ui_all_two'],
        api: ['api_one', 'api_two'],
        app: ['app_one', 'app_two'],
        catalogue: ['cat_one', 'cat_two'],
        management: { kibana: ['management_one', 'management_two'] },
        alerting: {
          rule: {
            all: ['alerting_rule_type_one', 'alerting_rule_type_two'],
            read: ['alerting_rule_type_one', 'alerting_rule_type_two'],
          },
          alert: {
            all: ['alerting_rule_type_one', 'alerting_rule_type_two'],
            read: ['alerting_rule_type_one', 'alerting_rule_type_two'],
          },
        },
        cases: {
          all: ['cases_owner_one', 'cases_owner_two'],
          push: ['cases_owner_one', 'cases_owner_two'],
          create: ['cases_owner_one', 'cases_owner_two'],
          read: ['cases_owner_one', 'cases_owner_two'],
          update: ['cases_owner_one', 'cases_owner_two'],
          delete: ['cases_owner_one', 'cases_owner_two'],
          settings: ['cases_owner_one', 'cases_owner_two'],
        },
        replacedBy: [
          { feature: 'case_2_feature_b', privileges: ['all'] },
          { feature: 'case_2_feature_c', privileges: ['all'] },
        ],
      },
      read: {
        savedObject: { all: [], read: ['one', 'two'] },
        ui: ['ui_read_one', 'ui_read_two'],
        catalogue: ['cat_one', 'cat_two'],
        app: ['app_one', 'app_two'],
        replacedBy: [
          { feature: 'case_2_feature_b', privileges: ['read'] },
          { feature: 'case_2_feature_c', privileges: ['read'] },
        ],
      },
    },
  });

  // Step 2: define new features
  deps.features.registerKibanaFeature({
    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_2_feature_b',
    name: 'Case #2 feature B',
    app: ['app_one'],
    catalogue: ['cat_one'],
    management: { kibana: ['management_one'] },
    alerting: ['alerting_rule_type_one'],
    cases: ['cases_owner_one'],
    privileges: {
      all: {
        savedObject: { all: ['one'], read: [] },
        ui: ['ui_all_one'],
        api: ['api_one'],
        app: ['app_one'],
        catalogue: ['cat_one'],
        management: { kibana: ['management_one'] },
        alerting: {
          rule: { all: ['alerting_rule_type_one'], read: ['alerting_rule_type_one'] },
          alert: { all: ['alerting_rule_type_one'], read: ['alerting_rule_type_one'] },
        },
        cases: {
          all: ['cases_owner_one'],
          push: ['cases_owner_one'],
          create: ['cases_owner_one'],
          read: ['cases_owner_one'],
          update: ['cases_owner_one'],
          delete: ['cases_owner_one'],
          settings: ['cases_owner_one'],
        },
      },
      read: {
        savedObject: { all: [], read: ['one'] },
        ui: ['ui_read_one'],
        catalogue: ['cat_one'],
        app: ['app_one'],
      },
    },
  });
  deps.features.registerKibanaFeature({
    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_2_feature_c',
    name: 'Case #2 feature C',
    app: ['app_two'],
    catalogue: ['cat_two'],
    management: { kibana: ['management_two'] },
    alerting: ['alerting_rule_type_two'],
    cases: ['cases_owner_two'],
    privileges: {
      all: {
        savedObject: { all: ['two'], read: [] },
        ui: ['ui_all_two'],
        api: ['api_two'],
        app: ['app_two'],
        catalogue: ['cat_two'],
        management: { kibana: ['management_two'] },
        alerting: {
          rule: { all: ['alerting_rule_type_two'], read: ['alerting_rule_type_two'] },
          alert: { all: ['alerting_rule_type_two'], read: ['alerting_rule_type_two'] },
        },
        cases: {
          all: ['cases_owner_two'],
          push: ['cases_owner_two'],
          create: ['cases_owner_two'],
          read: ['cases_owner_two'],
          update: ['cases_owner_two'],
          delete: ['cases_owner_two'],
          settings: ['cases_owner_two'],
        },
      },
      read: {
        savedObject: { all: [], read: ['two'] },
        ui: ['ui_read_two'],
        app: ['app_two'],
        catalogue: ['cat_two'],
      },
    },
  });

  // Register alerting rule types used in a deprecated feature.
  for (const [id, producer] of [
    ['alerting_rule_type_one', 'case_2_feature_a'],
    ['alerting_rule_type_two', 'case_2_feature_a'],
  ]) {
    deps.alerting.registerType({
      id,
      name: `${id}-${producer} name`,
      actionGroups: [{ id: 'default', name: 'Default' }],
      category: 'kibana',
      producer,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: () => Promise.resolve({ state: {} }),
      validate: { params: schema.any() },
    });
  }
}

function case3FeatureSplitSubFeature(deps: PluginSetupDependencies) {
  // Step 1: mark feature A as deprecated and provide proper replacements for all feature and
  // sub-feature privileges.
  deps.features.registerKibanaFeature({
    deprecated: { notice: 'Case #3 is deprecated.' },

    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_3_feature_a',
    name: 'Case #3 feature A (DEPRECATED)',
    app: [],
    privileges: {
      all: {
        savedObject: { all: ['one', 'two'], read: [] },
        ui: [],
        // Since `case_3_feature_a_v2.so_two_all` isn't automatically included in `case_3_feature_a_v2.all`,
        // we should map to both minimal `all` privilege and sub-feature privilege.
        replacedBy: [{ feature: 'case_3_feature_a_v2', privileges: ['minimal_all', 'so_two_all'] }],
      },
      read: {
        savedObject: { all: [], read: ['one', 'two'] },
        ui: [],
        replacedBy: [
          // Since `case_3_feature_a_v2.so_two_read` isn't automatically included in `case_3_feature_a_v2.read`,
          // we should map to both minimal `read` privilege and sub-feature privilege.
          { feature: 'case_3_feature_a_v2', privileges: ['minimal_read', 'so_two_read'] },
        ],
      },
    },
  });

  // Step 2: Create a new feature with the desired privileges structure.
  deps.features.registerKibanaFeature({
    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_3_feature_a_v2',
    name: 'Case #3 feature A',
    app: [],
    privileges: {
      all: {
        savedObject: { all: ['one'], read: [] },
        ui: [],
      },
      read: {
        savedObject: { all: [], read: ['one'] },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'Access to SO `two`',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'so_two_all',
                includeIn: 'none',
                name: 'All',
                savedObject: { all: ['two'], read: [] },
                ui: [],
              },
              {
                id: 'so_two_read',
                includeIn: 'none',
                name: 'Read',
                savedObject: { all: [], read: ['two'] },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });
}

function case4FeatureExtract(deps: PluginSetupDependencies) {
  for (const suffix of ['A', 'B']) {
    // Step 1: mark existing feature A and feature B as deprecated.
    deps.features.registerKibanaFeature({
      deprecated: { notice: 'Case #4 is deprecated.' },

      scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

      category: DEFAULT_APP_CATEGORIES.kibana,
      id: `case_4_feature_${suffix.toLowerCase()}`,
      name: `Case #4 feature ${suffix} (DEPRECATED)`,
      app: [],
      privileges: {
        all: {
          savedObject: { all: ['ab'], read: [] },
          ui: ['ui_all'],
          replacedBy: [
            { feature: `case_4_feature_${suffix.toLowerCase()}_v2`, privileges: ['all'] },
            { feature: `case_4_feature_c`, privileges: ['all'] },
          ],
        },
        read: {
          savedObject: { all: [], read: ['ab'] },
          ui: ['ui_read'],
          replacedBy: [
            { feature: `case_4_feature_${suffix.toLowerCase()}_v2`, privileges: ['read'] },
            { feature: `case_4_feature_c`, privileges: ['all'] },
          ],
        },
      },
    });

    // Step 2: introduce new features (v2) with privileges that don't grant access to `ab`.
    deps.features.registerKibanaFeature({
      scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

      category: DEFAULT_APP_CATEGORIES.kibana,
      id: `case_4_feature_${suffix.toLowerCase()}_v2`,
      name: `Case #4 feature ${suffix}`,
      app: [],
      privileges: {
        all: { savedObject: { all: [], read: [] }, ui: ['ui_all'] },
        read: { savedObject: { all: [], read: [] }, ui: ['ui_read'] },
      },
    });
  }

  // Step 3: introduce new feature C that only grants access to `ab`.
  deps.features.registerKibanaFeature({
    scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],

    category: DEFAULT_APP_CATEGORIES.kibana,
    id: 'case_4_feature_c',
    name: 'Case #4 feature C',
    app: [],
    privileges: {
      all: { savedObject: { all: ['ab'], read: [] }, ui: ['ui_all'] },
      read: { savedObject: { all: [], read: ['ab'] }, ui: ['ui_read'] },
    },
  });
}
