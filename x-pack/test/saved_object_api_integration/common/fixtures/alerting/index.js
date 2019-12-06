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
        id: 'alerting',
        name: 'alerting',
        icon: 'upArrow',
        navLinkId: 'alerting',
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
          },
        },
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
              all: [{ type: 'alerting', condition: { key: 'consumer', value: 'siem' } }],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [{ type: 'alerting', condition: { key: 'consumer', value: 'siem' } }],
            },
            ui: [],
          },
        },
      });

      server.plugins.xpack_main.registerFeature({
        id: 'siem_threshold_alerting',
        name: 'siem_threshold_alerting',
        icon: 'upArrow',
        navLinkId: 'siem_threshold_alerting',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [
                {
                  type: 'alerting',
                  condition: [
                    { key: 'consumer', value: 'siem' },
                    { key: 'alert_type', value: 'threshold' },
                  ],
                },
              ],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [
                {
                  type: 'alerting',
                  condition: [
                    { key: 'consumer', value: 'siem' },
                    { key: 'alert_type', value: 'threshold' },
                  ],
                },
              ],
            },
            ui: [],
          },
        },
      });

      server.plugins.xpack_main.registerFeature({
        id: 'stack_monitoring_threshold_alerting',
        name: 'stack_monitoring_threshold_alerting',
        icon: 'upArrow',
        navLinkId: 'stack_monitoring_threshold_alerting',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [
                {
                  type: 'alerting',
                  condition: [
                    { key: 'consumer', value: 'stack-monitoring' },
                    { key: 'alert_type', value: 'threshold' },
                  ],
                },
              ],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [
                {
                  type: 'alerting',
                  condition: [
                    { key: 'consumer', value: 'stack-monitoring' },
                    { key: 'alert_type', value: 'threshold' },
                  ],
                },
              ],
            },
            ui: [],
          },
        },
      });
    },
  });
}
