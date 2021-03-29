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
import { SAVED_OBJECT_TYPES as casesSavedObjectTypes } from '../../../../../../../plugins/cases/common/constants';
import { savedObjectTypes as securitySolutionSavedObjectTypes } from '../../../../../../../plugins/security_solution/server/saved_objects';

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
      cases: ['securitySolutionFixture'],
      privileges: {
        all: {
          app: ['kibana'],
          cases: {
            all: ['securitySolutionFixture'],
          },
          savedObject: {
            all: ['alert', ...casesSavedObjectTypes, ...securitySolutionSavedObjectTypes],
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
            read: [...casesSavedObjectTypes, ...securitySolutionSavedObjectTypes],
          },
          ui: [],
        },
      },
    });
  }
  public start() {}
  public stop() {}
}
