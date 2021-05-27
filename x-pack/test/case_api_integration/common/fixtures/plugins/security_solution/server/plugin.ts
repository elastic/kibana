/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from 'kibana/server';

import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { SpacesPluginStart } from '../../../../../../../plugins/spaces/server';
import { SecurityPluginStart } from '../../../../../../../plugins/security/server';
import { SEC_SOL_FIXTURE } from './index';

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
    features.registerKibanaFeature({
      id: 'securitySolutionFixture',
      name: 'SecuritySolutionFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: [SEC_SOL_FIXTURE],
      subFeatures: [
        {
          name: 'Cases',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  name: 'All',
                  id: 'cases_all',
                  includeIn: 'all',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: [],
                  cases: {
                    all: [SEC_SOL_FIXTURE],
                  },
                },
                {
                  name: 'Read',
                  id: 'cases_read',
                  includeIn: 'read',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: [],
                  cases: {
                    read: [SEC_SOL_FIXTURE],
                  },
                },
              ],
            },
          ],
        },
      ],
      privileges: {
        all: {
          app: ['kibana'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          app: ['kibana'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
  }
  public start() {}
  public stop() {}
}
