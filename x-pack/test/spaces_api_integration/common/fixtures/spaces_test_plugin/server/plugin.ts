/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';

export class Plugin {
  constructor() {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
    core.savedObjects.registerType({
      name: 'sharedtype',
      hidden: false,
      namespaceType: 'multiple',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
    });
  }

  public start() {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
