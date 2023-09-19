/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from '@kbn/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CasesStart, CasesSetup } from '@kbn/cases-plugin/server';
import { FilesSetup } from '@kbn/files-plugin/server';
import { getPersistableStateAttachment } from './attachments/persistable_state';
import { getExternalReferenceAttachment } from './attachments/external_reference';
import { registerRoutes } from './routes';
import { registerCaseFixtureFileKinds } from './files';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  cases: CasesSetup;
  files: FilesSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  cases: CasesStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly log: Logger;
  constructor(initContext: PluginInitializerContext) {
    this.log = initContext.logger.get();
  }

  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    deps.cases.attachmentFramework.registerExternalReference(getExternalReferenceAttachment());
    deps.cases.attachmentFramework.registerPersistableState(getPersistableStateAttachment());

    registerRoutes(core, this.log);
    registerCaseFixtureFileKinds(deps.files);

    /**
     * Kibana features
     */

    deps.features.registerKibanaFeature({
      id: 'testNoCasesConnectorFixture',
      name: 'TestNoCasesConnectorFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['testNoCasesConnectorFixture'],
      privileges: {
        all: {
          api: [],
          app: ['kibana'],
          cases: {
            create: ['testNoCasesConnectorFixture'],
            read: ['testNoCasesConnectorFixture'],
            update: ['testNoCasesConnectorFixture'],
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
            read: ['testNoCasesConnectorFixture'],
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

  public start(core: CoreStart, plugins: FixtureStartDeps) {}
  public stop() {}
}
