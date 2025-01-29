/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { Switch, MemoryRouter } from 'react-router-dom';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { PrivilegedRoute } from './privileged_route';
import type { PrivilegedRouteProps } from './privileged_route';
import { AdministrationSubTab } from '../../types';
import { MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH } from '../../common/constants';
import { MANAGEMENT_PATH } from '../../../../common/constants';

describe('PrivilegedRoute', () => {
  const noPrivilegesPageTestId = 'noPrivilegesPage';
  const noPermissionsPageTestId = 'noIngestPermissions';

  const componentTestId = 'component-to-render';

  let currentPath: string;
  let renderProps: PrivilegedRouteProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => void;

  beforeEach(() => {
    currentPath = 'path';
    renderProps = {
      component: () => <div data-test-subj={componentTestId} />,
      path: 'path',
      hasPrivilege: true,
    };

    const renderer = createAppRootMockRenderer();

    render = () => {
      renderResult = renderer.render(
        <MemoryRouter initialEntries={[currentPath]}>
          <Switch>
            <PrivilegedRoute {...renderProps} />
          </Switch>
        </MemoryRouter>
      );
    };
  });

  it('renders component if it has privileges and on correct path', async () => {
    render();

    expect(renderResult.getByTestId(componentTestId)).toBeTruthy();
    expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
    expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
  });

  it('renders nothing if path is different', async () => {
    renderProps.path = 'different';

    render();

    expect(renderResult.queryByTestId(componentTestId)).toBeNull();
    expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
    expect(renderResult.queryByTestId(noPrivilegesPageTestId)).toBeNull();
  });

  it('renders `you need to have privileges` on Response actions history', async () => {
    renderProps.hasPrivilege = false;
    renderProps.path = MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH;
    currentPath = `${MANAGEMENT_PATH}/${AdministrationSubTab.responseActionsHistory}`;

    render();

    expect(renderResult.getByTestId(noPrivilegesPageTestId)).toBeTruthy();
    expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
    expect(renderResult.queryByTestId(componentTestId)).toBeNull();
  });

  it('renders `you need to have RBAC privileges` if no privileges', async () => {
    renderProps.hasPrivilege = false;

    render();

    expect(renderResult.getByTestId(noPrivilegesPageTestId)).toBeTruthy();
    expect(renderResult.queryByTestId(noPermissionsPageTestId)).toBeNull();
    expect(renderResult.queryByTestId(componentTestId)).toBeNull();
  });
});
