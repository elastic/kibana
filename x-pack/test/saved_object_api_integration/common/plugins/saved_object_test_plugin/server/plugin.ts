/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, SavedObject } from '@kbn/core/server';

export class Plugin {
  constructor() {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
    const management = {
      importableAndExportable: true,
      getTitle(obj: SavedObject<any>) {
        return obj.attributes.title;
      },
    };
    const mappings = {
      properties: {
        title: { type: 'text' },
      },
    } as const;

    core.savedObjects.registerType({
      name: 'isolatedtype',
      hidden: false,
      namespaceType: 'single',
      management,
      mappings: {
        properties: {
          description: { type: 'text' },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: { type: 'text' },
            },
          },
          savedSearchId: { type: 'keyword' },
          title: { type: 'text' },
          uiStateJSON: { type: 'text' },
          version: { type: 'integer' },
          visState: { type: 'text' },
        },
      },
    });
    core.savedObjects.registerType({
      name: 'sharedtype',
      hidden: false,
      namespaceType: 'multiple',
      management,
      mappings,
    });
    core.savedObjects.registerType({
      name: 'sharecapabletype',
      hidden: false,
      namespaceType: 'multiple-isolated',
      management,
      mappings,
    });
    core.savedObjects.registerType({
      name: 'globaltype',
      hidden: false,
      namespaceType: 'agnostic',
      management,
      mappings,
    });
    core.savedObjects.registerType({
      name: 'hiddentype',
      hidden: true,
      namespaceType: 'single',
      mappings,
    });
    core.savedObjects.registerType({
      name: 'resolvetype',
      hidden: false,
      namespaceType: 'multiple',
      management,
      mappings,
    });
  }

  public start() {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
