/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, Plugin, CoreSetup } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';
import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
}

export const plugin: PluginInitializer<void, void> = async (): Promise<
  Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>
> => ({
  setup: (core: CoreSetup<PluginStartDependencies>, deps: PluginSetupDependencies) => {
    initRoutes(core);

    // Case #1: feature needs to be renamed. We don't need to deprecate privilege, we just need to make sure we
    // maintain feature ID via `privilegesIdPrefix`. Privilege ID is an implementation detail and it shouldn't matter
    // what ID is used there. When `privilegesIdPrefix` isn't specified, feature ID is used instead.
    deps.features.registerKibanaFeature({
      deprecated: false,
      // privilegesIdPrefix: 'feature_case_1_rename_feature',

      app: [],
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_1_rename_feature',
      name: 'Feature Case #1 (RENAME)',
      privileges: {
        all: {
          savedObject: { all: [], read: [] },
          ui: ['ui_case_1_rename_feature_all'],
        },
        read: {
          savedObject: { all: [], read: [] },
          ui: [],
        },
      },
    });

    // Case #2: feature needs to be split into two separate features. In this case we mark feature as deprecated and
    // create two new features. Special care should be taken for UI portion. E.g., if on the client side you were
    // checking `feature_case_2_split_feature.ui_case_2_split_feature_all_one` if you should respecting it in addition
    // to UI capabilities introduced by the new features.
    // Also, to represent this feature in UI we should define mapping.
    deps.features.registerKibanaFeature({
      deprecated: true,

      app: ['app_one'],
      catalogue: ['cat_one'],
      management: { kibana: ['management_one'] },
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_2_split_feature',
      name: 'Feature Case #2 (SPLIT, DEPRECATED)',
      alerting: [
        'alerting_rule_all_one',
        'alerting_rule_read_one',
        'alerting_alert_all_one',
        'alerting_alert_read_one',
      ],
      cases: ['cases_all_one', 'cases_read_one'],
      privileges: {
        all: {
          savedObject: { all: ['one', 'two'], read: [] },
          ui: ['ui_case_2_split_feature_all_one', 'ui_case_2_split_feature_all_two'],
          api: ['api_one'],
          app: ['app_one'],
          catalogue: ['cat_one'],
          management: { kibana: ['management_one'] },
          alerting: {
            rule: {
              all: ['alerting_rule_all_one'],
              read: ['alerting_rule_read_one'],
            },
            alert: {
              all: ['alerting_alert_all_one'],
              read: ['alerting_alert_read_one'],
            },
          },
          cases: {
            all: ['cases_all_one'],
            push: ['cases_push_one'],
            create: ['cases_create_one'],
            read: ['cases_read_one'],
            update: ['cases_update_one'],
            delete: ['cases_delete_one'],
            settings: ['cases_settings_one'],
          },
          replacedBy: [
            { feature: 'feature_case_2_split_feature_one', privileges: ['all'] },
            { feature: 'feature_case_2_split_feature_two', privileges: ['all'] },
          ],
        },
        read: {
          savedObject: { all: [], read: ['one', 'two'] },
          ui: [],
          replacedBy: [
            { feature: 'feature_case_2_split_feature_one', privileges: ['read'] },
            { feature: 'feature_case_2_split_feature_two', privileges: ['read'] },
          ],
        },
      },
    });
    deps.features.registerKibanaFeature({
      app: [],
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_2_split_feature_one',
      name: 'Feature Case #2 (SPLIT, NEW #1)',
      app: ['app_one'],
      alerting: [
        'alerting_rule_all_one',
        'alerting_rule_read_one',
        'alerting_alert_all_one',
        'alerting_alert_read_one',
      ],
      cases: ['cases_all_one', 'cases_read_one'],
      privileges: {
        all: {
          savedObject: { all: ['one'], read: [] },
          ui: ['ui_case_2_split_feature_all_one'],
          api: ['api_one'],
          app: ['app_one'],
          alerting: {
            rule: {
              all: ['alerting_rule_all_one'],
              read: ['alerting_rule_read_one'],
            },
            alert: {
              all: ['alerting_alert_all_one'],
              read: ['alerting_alert_read_one'],
            },
          },
          cases: {
            all: ['cases_all_one'],
            push: ['cases_push_one'],
            create: ['cases_create_one'],
            read: ['cases_read_one'],
            update: ['cases_update_one'],
            delete: ['cases_delete_one'],
            settings: ['cases_settings_one'],
          },
        },
        read: {
          savedObject: { all: [], read: ['one'] },
          ui: [],
        },
      },
    });
    deps.features.registerKibanaFeature({
      app: [],
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_2_split_feature_two',
      name: 'Feature Case #2 (SPLIT, NEW #2)',
      privileges: {
        all: {
          savedObject: { all: ['two'], read: [] },
          ui: ['ui_case_2_split_feature_all_two'],
        },
        read: {
          savedObject: { all: [], read: ['two'] },
          ui: [],
        },
      },
    });

    // Case #3: feature grants access to Saved Object types `one` and `two` via top-level `all` and `read` privileges.
    // The requirement is to not grant access to `two` via top-level privileges, and instead use sub-feature privilege
    // for that.
    // Step 1: mark existing privilege as deprecated.
    deps.features.registerKibanaFeature({
      deprecated: true,

      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_3',
      name: 'Feature Case #3 (EXTRACT TO SUB FEATURE, DEPRECATED)',
      app: [],
      privileges: {
        all: {
          savedObject: { all: ['one', 'two'], read: [] },
          ui: [],
          replacedBy: [{ feature: 'feature_case_3_v2', privileges: ['minimal_all', 'so_two_all'] }],
        },
        read: {
          savedObject: { all: [], read: ['one', 'two'] },
          ui: [],
          replacedBy: [
            { feature: 'feature_case_3_v2', privileges: ['minimal_read', 'so_two_read'] },
          ],
        },
      },
    });

    // Step 2: Create a new feature with the desired privileges structure.
    deps.features.registerKibanaFeature({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'feature_case_3_v2',
      name: 'Feature Case #3 (V2)',
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
  },
  start: () => {},
  stop: () => {},
});
