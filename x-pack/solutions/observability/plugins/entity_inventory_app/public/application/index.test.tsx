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
import { createFixtureEntityInventoryApiClient } from '../__fixtures__/inventory_client';
import { createAppServicesMock, createCoreStartMock, createStartDependenciesMock } from '../mocks';
import { ENTITY_INVENTORY_PAGES } from '../pages';
import { entityInventoryRouter } from '../routes/config';
import { EntityInventoryShell, renderApp } from '.';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

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

  it('lists one section per type on the all resources page, in the order of the types response', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const { types } = await fixtureClient.getTypes({});
    const reversedTypes = [...types].reverse();
    renderShellAt('/all-resources', {
      ...fixtureClient,
      getTypes: async () => ({ types: reversedTypes }),
    });

    await waitFor(() => expect(screen.getAllByTestId('entityInventoryTable')).toHaveLength(2));
    expect(
      screen
        .getAllByTestId('entityInventoryTypeSection')
        .map((section) => section.getAttribute('data-entity-type'))
    ).toEqual(reversedTypes.map(({ type }) => type));
    expect(screen.queryByTestId('entityInventoryTypeNotAvailable')).not.toBeInTheDocument();
  });

  it.each(['/hosts', '/kubernetes', '/all-resources'])(
    'shows one error with a retry and no sections on %s when the types request fails',
    async (path) => {
      const fixtureClient = createFixtureEntityInventoryApiClient();
      const getEntities = jest.fn(fixtureClient.getEntities);
      renderShellAt(path, {
        getTypes: () => Promise.reject(new Error('Types failed')),
        getEntities,
      });

      expect(await screen.findByTestId('entityInventoryTableError')).toHaveTextContent(
        'Types failed'
      );
      expect(screen.getAllByTestId('entityInventoryTableError')).toHaveLength(1);
      expect(screen.getByTestId('entityInventoryTableRetry')).toBeInTheDocument();
      expect(screen.queryByTestId('entityInventoryTypeSection')).not.toBeInTheDocument();
      expect(getEntities).not.toHaveBeenCalled();
    }
  );

  it('says a page type missing from the types response is not available, without listing it', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const { types } = await fixtureClient.getTypes({});
    const getEntities = jest.fn(() => Promise.reject(new Error('Request failed')));
    renderShellAt('/kubernetes', {
      getTypes: async () => ({ types: types.filter(({ type }) => type === 'host') }),
      getEntities,
    });

    expect(await screen.findByTestId('entityInventoryTypeNotAvailable')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTableError')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTypeSection')).not.toBeInTheDocument();
    expect(getEntities).not.toHaveBeenCalled();
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

    act(() => history.push('/kubernetes'));
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'k8s.deployment'
    );
    act(() => history.push('/hosts'));

    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-host.name')).toBeInTheDocument();
    expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument();
  });

  it('requests the entity types once while moving between pages, and renders each page from that response', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const getTypes = jest.fn(fixtureClient.getTypes);
    const { history } = renderShellAt('/hosts', { ...fixtureClient, getTypes });
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'host'
    );

    act(() => history.push('/kubernetes'));
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'k8s.deployment'
    );

    act(() => history.push('/all-resources'));
    await waitFor(() => expect(screen.getAllByTestId('entityInventoryTable')).toHaveLength(2));

    act(() => history.push('/hosts'));
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'host'
    );
    expect(getTypes).toHaveBeenCalledTimes(1);
  });

  it('requests the entity types once more on a retry after the types request fails, and not again on a page change', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const getTypes = jest
      .fn(fixtureClient.getTypes)
      .mockRejectedValueOnce(new Error('Types failed'));
    const { history } = renderShellAt('/hosts', { ...fixtureClient, getTypes });
    expect(await screen.findByTestId('entityInventoryTableError')).toBeInTheDocument();
    expect(getTypes).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('entityInventoryTableRetry'));

    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'host'
    );
    expect(getTypes).toHaveBeenCalledTimes(2);

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
