/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    const { features } = deps;
    this.registerFeatures(features);
  }

  public start() {}

  public stop() {}

  private registerFeatures(features: FeaturesPluginSetup) {
    features.registerKibanaFeature({
      id: 'securitySolutionFixture',
      name: 'SecuritySolutionFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      cases: ['securitySolutionFixture'],
      privileges: {
        all: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'casesGetConnectorsConfigure'],
          app: ['kibana'],
          cases: {
            create: ['securitySolutionFixture'],
            read: ['securitySolutionFixture'],
            update: ['securitySolutionFixture'],
            push: ['securitySolutionFixture'],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
        read: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'casesGetConnectorsConfigure'],
          app: ['kibana'],
          cases: {
            read: ['securitySolutionFixture'],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'Delete',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Delete cases and comments',
                  id: 'cases_delete',
                  includeIn: 'all',
                  cases: {
                    delete: ['securitySolutionFixture'],
                  },
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Case settings',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Edit case settings',
                  id: 'cases_settings',
                  includeIn: 'all',
                  cases: {
                    settings: ['securitySolutionFixture'],
                  },
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Add comments',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Add comments to cases',
                  id: 'create_comment',
                  includeIn: 'all',
                  cases: {
                    createComment: ['securitySolutionFixture'],
                  },
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Re-open closed cases',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Re-open closed cases',
                  id: 'case_reopen',
                  includeIn: 'all',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  cases: {
                    reopenCase: ['securitySolutionFixture'],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Assign users',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'cases_assign',
                  name: 'Assign users to cases',
                  includeIn: 'all',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  cases: {
                    assign: ['securitySolutionFixture'],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
      ],
    });

    features.registerKibanaFeature({
      id: 'testDisabledFixtureID',
      name: 'TestDisabledFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      // testDisabledFixture is disabled in space1
      cases: ['testDisabledFixture'],
      privileges: {
        all: {
          app: ['kibana'],
          cases: {
            all: ['testDisabledFixture'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          app: ['kibana'],
          cases: {
            read: ['testDisabledFixture'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
  }
}
