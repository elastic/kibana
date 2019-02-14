/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
// @ts-ignore
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { DisplayUICapabilities } from '../../components/display_ui_capabilities';
import { TestAppShell } from '../../components/test_app_shell';
import appTemplate from './index.html';

if (uiRoutes.enable) {
  uiRoutes.enable();
}

uiRoutes
  .when('/home', {
    template: appTemplate,
    k7Breadcrumbs: () => [],
    controller($scope: any) {
      $scope.$$postDigest(async () => {
        const domNode = document.getElementById('testReactRoot');

        const app = (
          <TestAppShell
            data-test-subj="ft-registered-app"
            appTitle="Registered Application"
            pageContent={<DisplayUICapabilities />}
          />
        );

        render(app, domNode);

        // unmount react on controller destroy
        $scope.$on('$destroy', () => {
          if (domNode) {
            unmountComponentAtNode(domNode);
          }
        });
      });
    },
  })
  .otherwise({
    redirectTo: '/home',
  });
