/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    name: 'foo',
    uiExports: {
      app: {
        title: 'Foo',
        order: 1000,
        euiIconType: 'uiArray',
        description: 'Foo app',
        main: 'plugins/foo_plugin/app',
      },
    },

    init(server) {
      server.plugins.xpack_main.registerFeature({
        id: 'foo',
        name: 'Foo',
        icon: 'upArrow',
        navLinkId: 'foo_plugin',
        app: ['kibana'],
        catalogue: ['foo'],
        privileges: {
          all: {
            savedObject: {
              all: ['foo'],
              read: ['index-pattern'],
            },
            ui: ['create', 'edit', 'delete', 'show'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['foo', 'index-pattern'],
            },
            ui: ['show'],
          },
        },
      });
    },
  });
}
