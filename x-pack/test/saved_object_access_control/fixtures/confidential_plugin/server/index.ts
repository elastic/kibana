/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, CoreSetup } from 'src/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../../../../plugins/features/server';

export const CONFIDENTIAL_SAVED_OBJECT_TYPE = 'confidential';
export const CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE = 'confidential_multinamespace';

interface PluginSetupDeps {
  features: FeaturesPluginSetup;
}

export const plugin: PluginInitializer<void, void, PluginSetupDeps, {}> = () => ({
  setup(core: CoreSetup<{}>, { features }: PluginSetupDeps) {
    core.savedObjects.registerType({
      name: CONFIDENTIAL_SAVED_OBJECT_TYPE,
      hidden: false,
      namespaceType: 'single',
      accessClassification: 'private',
      management: {
        importableAndExportable: true,
      },
      mappings: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    });

    core.savedObjects.registerType({
      name: CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE,
      hidden: false,
      namespaceType: 'multiple',
      accessClassification: 'private',
      management: {
        importableAndExportable: true,
      },
      mappings: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    });

    features.registerKibanaFeature({
      id: 'testConfidentialPlugin',
      name: 'Test Confidential Plugin',
      category: { id: 'test', label: 'test' },
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: [CONFIDENTIAL_SAVED_OBJECT_TYPE, CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [CONFIDENTIAL_SAVED_OBJECT_TYPE, CONFIDENTIAL_MULTI_NAMESPACE_SAVED_OBJECT_TYPE],
          },
          ui: [],
        },
      },
    });
  },
  start() {},
  stop() {},
});
