/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import type { EntityInventoryApiClient } from '../inventory_api/client';
import { createFixtureEntityInventoryApiClient } from '../inventory_api/fixture_client';
import { createAppServicesMock, createCoreStartMock, createStartDependenciesMock } from '../mocks';
import { ENTITY_INVENTORY_PAGES } from '../pages';
import { entityInventoryRouter } from '../routes/config';
import { ENTITY_LIST_PLACEHOLDER } from './translations';
import { EntityInventoryShell, renderApp } from '.';

const PageTemplate = (({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)) as unknown as ObservabilitySharedPluginStart['navigation']['PageTemplate'];

const APP_BASE_PATH = '/app/entity-inventory';

const renderShell = (
  history: History,
  inventoryApi: EntityInventoryApiClient = createFixtureEntityInventoryApiClient()
) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <MockAppHeaderProvider>
          <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
            <RouterProvider history={history} router={entityInventoryRouter}>
              <EntityInventoryShell PageTemplate={PageTemplate} />
            </RouterProvider>
          </KibanaContextProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderShellAt = (path: string, inventoryApi?: EntityInventoryApiClient) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  renderShell(history, inventoryApi);

  return { history };
};

describe('EntityInventoryShell', () => {
  it.each(ENTITY_INVENTORY_PAGES)(
    'renders the page shell and title for the entity category of $path',
    async ({ entityCategory, path, title }) => {
      renderShellAt(path);

      expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
        'data-entity-category',
        entityCategory
      );
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByTestId('entityInventoryTableLoading')).toBeNull());
    }
  );

  it('keeps the placeholder on the all resources page until grouping lands', () => {
    renderShellAt('/all-resources');

    expect(screen.getByTestId('entityInventoryPlaceholder')).toHaveTextContent(
      ENTITY_LIST_PLACEHOLDER
    );
  });

  it.each([
    ['/hosts', 'host'],
    ['/kubernetes', 'k8s.deployment'],
  ])('renders the results table of the page %s for the type %s', async (path, entityType) => {
    renderShellAt(path);

    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      entityType
    );
    expect(screen.queryByTestId('entityInventoryPlaceholder')).not.toBeInTheDocument();
  });

  it('keeps the column choices of a type while another page is open', async () => {
    const { history } = renderShellAt('/hosts');
    expect(await screen.findByTestId('dataGridHeaderCell-cloud.account.id')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-cloud.account.id'));
    const hideColumn = within(screen.getByTestId('dataGridHeaderCellActionGroup-cloud.account.id'))
      .getAllByRole('button')
      .find((button) => button.textContent === 'Hide column');
    if (!hideColumn) {
      throw new Error('No hide action');
    }
    fireEvent.click(hideColumn);
    await waitFor(() =>
      expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument()
    );

    act(() => history.push('/all-resources'));
    expect(await screen.findByTestId('entityInventoryPlaceholder')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTable')).not.toBeInTheDocument();
    act(() => history.push('/hosts'));

    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-host.name')).toBeInTheDocument();
    expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument();
  });

  it('requests the entity types again on a page change', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const getTypes = jest.fn(fixtureClient.getTypes);
    const { history } = renderShellAt('/hosts', { ...fixtureClient, getTypes });
    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(getTypes).toHaveBeenCalledTimes(1);

    act(() => history.push('/kubernetes'));

    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'k8s.deployment'
    );
    expect(getTypes).toHaveBeenCalledTimes(2);
  });

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
