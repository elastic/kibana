/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { createMemoryHistory } from 'history';
import type { History } from 'history';
import { CoreScopedHistory } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { createCoreStartMock, createStartDependenciesMock } from '../mocks';
import { ENTITY_INVENTORY_PAGES } from '../pages';
import { entityInventoryRouter } from '../routes/config';
import { ENTITY_LIST_PLACEHOLDER } from './translations';
import { EntityInventoryShell, renderApp } from '.';

const PageTemplate = (({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)) as unknown as ObservabilitySharedPluginStart['navigation']['PageTemplate'];

const APP_BASE_PATH = '/app/entity-inventory';

const renderShell = (history: History) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <MockAppHeaderProvider>
          <KibanaContextProvider
            services={{ ...createCoreStartMock(), ...createStartDependenciesMock() }}
          >
            <RouterProvider history={history} router={entityInventoryRouter}>
              <EntityInventoryShell PageTemplate={PageTemplate} />
            </RouterProvider>
          </KibanaContextProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderShellAt = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  renderShell(history);

  return { history };
};

describe('EntityInventoryShell', () => {
  it.each(ENTITY_INVENTORY_PAGES)(
    'renders the page shell and title for the entity category of $path',
    ({ entityCategory, path, title }) => {
      renderShellAt(path);

      expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
        'data-entity-category',
        entityCategory
      );
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      expect(screen.getByTestId('entityInventoryPlaceholder')).toHaveTextContent(
        ENTITY_LIST_PLACEHOLDER
      );
    }
  );

  it.each(['/', '/unknown'])('redirects the path %s to all resources', (path) => {
    const { history } = renderShellAt(path);

    expect(history.location.pathname).toBe('/all-resources');
    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-category',
      'all'
    );
  });

  it('redirects the base path of the app, where the scoped history has an empty pathname', () => {
    const parentHistory = createMemoryHistory({ initialEntries: [APP_BASE_PATH] });
    const scopedHistory = new CoreScopedHistory(parentHistory, APP_BASE_PATH);
    expect(scopedHistory.location.pathname).toBe('');

    renderShell(scopedHistory);

    expect(parentHistory.location.pathname).toBe(`${APP_BASE_PATH}/all-resources`);
    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-category',
      'all'
    );
  });
});

describe('renderApp', () => {
  it('mounts the routed app within the core rendering context and unmounts it', () => {
    const core = createCoreStartMock();
    const params = coreMock.createAppMountParameters(APP_BASE_PATH);
    params.history.push('/kubernetes');

    let unmount: () => void = () => {};
    act(() => {
      unmount = renderApp(core, createStartDependenciesMock(), params);
    });

    expect(core.rendering.addContext).toHaveBeenCalledTimes(1);
    expect(
      params.element.querySelector('[data-test-subj="entityInventoryPageShell"]')
    ).toHaveAttribute('data-entity-category', 'kubernetes');

    act(() => unmount());

    expect(params.element.childElementCount).toBe(0);
  });
});
