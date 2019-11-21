/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import mappings from './mappings.json';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    name: 'super_type_plugin',
    uiExports: {
      savedObjectsManagement: {},
      savedObjectSchemas: {
        super_type: {
          superType: {
            commonAttributes: ['name'],
            subTypes: ['sub_type_1', 'sub_type_2']
          }
        }
      },
      mappings,
    },

    config() {},

    init(server) {
      const xpackMainPlugin = server.plugins.xpack_main;
      xpackMainPlugin.registerFeature({
        id: 'super_type',
        name: 'super_type',
        icon: 'upArrow',
        navLinkId: 'super_type',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [
                'super_type',
                'super_type:*',
              ],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [
                'super_type',
                'super_type:*',
              ],
            },
            ui: [],
          },
        },
      });

      xpackMainPlugin.registerFeature({
        id: 'sub_type_1',
        name: 'sub_type_1',
        icon: 'upArrow',
        navLinkId: 'sub_type_1',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [
                'super_type:sub_type_1',
              ],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [
                'super_type:sub_type_1',
              ],
            },
            ui: [],
          },
        },
      });

      xpackMainPlugin.registerFeature({
        id: 'sub_type_2',
        name: 'sub_type_2',
        icon: 'upArrow',
        navLinkId: 'sub_type_2',
        app: [],
        privileges: {
          all: {
            savedObject: {
              all: [
                'super_type:sub_type_2',
              ],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [
                'super_type:sub_type_2',
              ],
            },
            ui: [],
          },
        },
      });
    }
  });
}
