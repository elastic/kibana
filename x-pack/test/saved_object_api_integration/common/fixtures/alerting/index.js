/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    name: 'alerting_plugin',
    uiExports: {
      savedObjectsManagement: {},
      savedObjectSchemas: {},
      mappings,
    },

    config() {},
    init(server) {
      server.plugins.xpack_main.registerFeature({
        id: 'alerting_plugin',
        name: 'alerting_plugin',
        icon: 'upArrow',
        navLinkId: 'alerting_plugin',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: ['alerting'],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: ['alerting'],
            },
            ui: [],
          }
        }
      });

      server.plugins.xpack_main.registerFeature({
        id: 'siem_alerting',
        name: 'siem_alerting',
        icon: 'upArrow',
        navLinkId: 'siem_alerting',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [{ type: 'alerting', when: { key: 'consumer', value: 'siem' } }],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [{ type: 'alerting', when: { key: 'consumer', value: 'siem' } }],
            },
            ui: [],
          }
        }
      });
    },
  });
}
