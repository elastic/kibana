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
      id: 'observabilityFixture',
      name: 'ObservabilityFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['observabilityFixture'],
      privileges: {
        all: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'casesGetConnectorsConfigure'],
          app: ['kibana'],
          cases: {
            all: ['observabilityFixture'],
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
            read: ['observabilityFixture'],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
      },
    });
  }
  public start() {}
  public stop() {}
}
