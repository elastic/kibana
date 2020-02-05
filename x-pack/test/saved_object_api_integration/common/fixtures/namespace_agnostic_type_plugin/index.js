/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    name: 'namespace_agnostic_type_plugin',
    uiExports: {
      savedObjectsManagement: {
        globaltype: {
          isImportableAndExportable: true,
        },
      },
      savedObjectSchemas: {
        globaltype: {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
    },

    config() {},

    init(server) {
      server.plugins.xpack_main.registerFeature({
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
    },
  });
}
