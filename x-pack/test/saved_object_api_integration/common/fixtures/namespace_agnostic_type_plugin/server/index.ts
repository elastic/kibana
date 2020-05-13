/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../../../../../plugins/features/server';

export const plugin = () => new NamespaceAgnosticTypePlugin();

interface SetupDeps {
  features: FeaturesPluginSetupContract;
}

class NamespaceAgnosticTypePlugin implements Plugin {
  setup(core: CoreSetup, plugins: SetupDeps) {
    core.savedObjects.registerType({
      name: 'globaltype',
      hidden: false,
      namespaceType: 'agnostic',
      management: {
        importableAndExportable: true,
      },
      mappings: {
        properties: {
          title: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 2048,
              },
            },
          },
        },
      },
    });

    plugins.features.registerFeature({
      id: 'namespace_agnostic_type_plugin',
      name: 'namespace_agnostic_type_plugin',
      icon: 'upArrow',
      navLinkId: 'namespace_agnostic_type_plugin',
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: ['globaltype'],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: ['globaltype'],
          },
          ui: [],
        },
      },
    });
  }
  start() {}
}
