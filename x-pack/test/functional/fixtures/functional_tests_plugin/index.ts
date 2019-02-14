/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

// tslint:disable:no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['xpack_main'],
    id: 'functional_tests_plugin',
    name: 'functional_tests_plugin',
    uiExports: {
      apps: [
        {
          id: 'unregisteredApp',
          description: 'unregistered app description',
          euiIconType: 'questionInCircle',
          main: 'plugins/functional_tests_plugin/apps/unregistered',
          title: 'Unregistered App',
          url: `/app/unregisteredApp#/home`,
        },
        {
          id: 'registeredApp',
          description: 'registered app description',
          euiIconType: 'questionInCircle',
          main: 'plugins/functional_tests_plugin/apps/registered',
          title: 'Registered App',
          url: `/app/registeredApp#/home`,
        },
      ],
    },

    config() {
      return;
    },

    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: 'functional-tests-feature',
        navLinkId: 'registeredApp',
        app: ['registeredApp', 'kibana'],
        name: 'Functional Tests Feature',
        privileges: {
          all: {
            ui: ['allTheThings'],
            savedObject: {
              all: [],
              read: ['config'],
            },
          },
        },
      });
    },
  });
}
