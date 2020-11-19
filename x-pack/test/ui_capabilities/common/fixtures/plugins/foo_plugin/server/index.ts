/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../../../../../../plugins/features/server';

export const plugin = () => new FooPlugin();

interface SetupDeps {
  features: FeaturesPluginSetupContract;
}

class FooPlugin implements Plugin {
  setup(core: CoreSetup, plugins: SetupDeps) {
    plugins.features.registerKibanaFeature({
      id: 'foo',
      name: 'Foo',
      category: { id: 'foo', label: 'foo' },
      app: ['foo_plugin', 'kibana'],
      catalogue: ['foo'],
      privileges: {
        all: {
          app: ['foo_plugin', 'kibana'],
          catalogue: ['foo'],
          savedObject: {
            all: ['foo'],
            read: ['index-pattern'],
          },
          ui: ['create', 'edit', 'delete', 'show'],
        },
        read: {
          app: ['foo_plugin', 'kibana'],
          catalogue: ['foo'],
          savedObject: {
            all: [],
            read: ['foo', 'index-pattern'],
          },
          ui: ['show'],
        },
      },
    });
  }
  start() {}
}
