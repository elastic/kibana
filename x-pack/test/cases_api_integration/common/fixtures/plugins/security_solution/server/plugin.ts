/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  Logger,
  IRouter,
  RequestHandlerContext,
  CoreStart,
} from '@kbn/core/server';

import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { INTERNAL_USER_PROFILES_BULK_GET, UserProfilesBulkGetSchema } from '.';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly logger: Logger;

  private securityStart?: SecurityPluginStart;
  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    const router = core.http.createRouter();
    this.registerRoutes(router);

    const { features } = deps;
    this.registerFeatures(features);
  }

  public start(core: CoreStart, plugins: FixtureStartDeps) {
    this.securityStart = plugins.security;
  }

  public stop() {}

  private registerRoutes(router: IRouter<RequestHandlerContext>) {
    router.post(
      {
        path: INTERNAL_USER_PROFILES_BULK_GET,
        validate: {
          body: UserProfilesBulkGetSchema,
        },
      },
      async (context, request, response) => {
        try {
          if (!this.securityStart) {
            throw new Error('securityStart was undefined');
          }

          const userProfiles = await this.securityStart.userProfiles.bulkGet({
            uids: new Set(request.body.uids),
            dataPath: request.body.dataPath,
          });

          return response.ok({
            body: userProfiles,
          });
        } catch (error) {
          this.logger.error(`SecuritySolutionFixture failure: ${error}`);
          throw error;
        }
      }
    );
  }

  private registerFeatures(features: FeaturesPluginSetup) {
    features.registerKibanaFeature({
      id: 'securitySolutionFixture',
      name: 'SecuritySolutionFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['securitySolutionFixture'],
      privileges: {
        all: {
          api: ['casesSuggestUserProfiles'],
          app: ['kibana'],
          cases: {
            create: ['securitySolutionFixture'],
            read: ['securitySolutionFixture'],
            update: ['securitySolutionFixture'],
            push: ['securitySolutionFixture'],
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
            read: ['securitySolutionFixture'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'Custom privileges',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Delete',
                  id: 'cases_delete',
                  includeIn: 'all',
                  cases: {
                    delete: ['securitySolutionFixture'],
                  },
                  savedObject: {
                    all: [],
                    read: [],
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
