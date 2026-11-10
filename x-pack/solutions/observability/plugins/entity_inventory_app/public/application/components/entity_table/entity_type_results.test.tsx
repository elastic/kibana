/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryApiClient } from '../../../inventory_api/client';
import { createFixtureEntityInventoryApiClient } from '../../../inventory_api/fixture_client';
import { HOST_TYPE_FIXTURE } from '../../../inventory_api/fixture_data';
import type { FixtureScenario } from '../../../inventory_api/fixture_scenarios';
import { createScenarioEntityInventoryApiClient } from '../../../inventory_api/fixture_scenarios';
import { createAppServicesMock } from '../../../mocks';
import { EntityTablePreferencesProvider } from '../../context/entity_table_preferences_context';
import {
  EntityInventorySearchProvider,
  useEntityInventorySearch,
} from '../../context/search_context';
import { EntityTypeResults } from './entity_type_results';
import {
  EMPTY_BODY,
  LOAD_ERROR_TITLE,
  RETRY_LABEL,
  EMPTY_WITH_FAILURES_BODY,
  getEmptyTitle,
  getEmptyWithFailuresTitle,
  getTruncationTitle,
  getTruncationTotalUnknownTitle,
  getTypeNotAvailableTitle,
} from './translations';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

const NEW_RANGE_LABEL = 'Pick a new range';

const NewRangeButton = () => {
  const { submit } = useEntityInventorySearch();
  return (
    <button onClick={() => submit({ dateRange: { from: 'now-1h', to: 'now' } })}>
      {NEW_RANGE_LABEL}
    </button>
  );
};

const renderResults = (inventoryApi: EntityInventoryApiClient, entityType = 'host') => {
  const history = createMemoryHistory();
  const results = (type: string) => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
          <EntityTablePreferencesProvider>
            <Router history={history}>
              <EntityInventorySearchProvider entityCategory="hosts">
                <NewRangeButton />
                <EntityTypeResults entityType={type} />
              </EntityInventorySearchProvider>
            </Router>
          </EntityTablePreferencesProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const { rerender, ...rest } = render(results(entityType));
  return { ...rest, showType: (type: string) => rerender(results(type)) };
};

const renderScenario = (scenario: FixtureScenario) =>
  renderResults(createScenarioEntityInventoryApiClient({ scenario }));

describe('EntityTypeResults', () => {
  it('shows a loading prompt until the entities arrive, then the table', async () => {
    renderScenario('normal');

    expect(screen.getByTestId('entityInventoryTableLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'host'
    );
    expect(screen.queryByTestId('entityInventoryTableLoading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTruncationCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryDiagnosticsCallout')).not.toBeInTheDocument();
  });

  it('warns that a truncated list holds only the most recent entities', async () => {
    renderScenario('truncated');

    expect(await screen.findByTestId('entityInventoryTruncationCallout')).toHaveTextContent(
      getTruncationTitle({ returned: 250, total: 12_345 })
    );
    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
  });

  it('warns that the total is unknown when the count failed', async () => {
    renderScenario('countFailed');

    expect(await screen.findByTestId('entityInventoryTruncationCallout')).toHaveTextContent(
      getTruncationTotalUnknownTitle({ returned: 250 })
    );
  });

  it('lists source errors and unavailable columns above the table', async () => {
    renderScenario('withDiagnostics');

    expect(await screen.findByTestId('entityInventoryDiagnosticsCallout')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
  });

  it('shows an empty prompt when no entities match', async () => {
    renderScenario('empty');

    const empty = await screen.findByTestId('entityInventoryTableEmpty');
    expect(empty).toHaveTextContent(getEmptyTitle(HOST_TYPE_FIXTURE.name));
    expect(empty).toHaveTextContent(EMPTY_BODY);
    expect(screen.queryByTestId('entityInventoryTable')).not.toBeInTheDocument();
  });

  it('explains an empty result caused by failing sources', async () => {
    renderScenario('allSourcesFailed');

    const empty = await screen.findByTestId('entityInventoryTableEmpty');
    expect(empty).toHaveTextContent(getEmptyWithFailuresTitle(HOST_TYPE_FIXTURE.name));
    expect(empty).toHaveTextContent(EMPTY_WITH_FAILURES_BODY);
    expect(empty).not.toHaveTextContent(EMPTY_BODY);
    expect(screen.getByTestId('entityInventoryDiagnosticsCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTruncationCallout')).not.toBeInTheDocument();
  });

  it('shows the error with a retry that lists again', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const getEntities = jest
      .fn(fixtureClient.getEntities)
      .mockRejectedValueOnce(new Error('Request failed'));
    renderResults({ ...fixtureClient, getEntities });

    const error = await screen.findByTestId('entityInventoryTableError');
    expect(error).toHaveTextContent(LOAD_ERROR_TITLE);
    expect(error).toHaveTextContent('Request failed');

    fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));

    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(getEntities).toHaveBeenCalledTimes(2);
  });

  it('says the type is not available when it is not registered, without a retry', async () => {
    renderResults(createFixtureEntityInventoryApiClient(), 'service');

    expect(await screen.findByTestId('entityInventoryTypeNotAvailable')).toHaveTextContent(
      getTypeNotAvailableTitle('service')
    );
    expect(screen.queryByRole('button', { name: RETRY_LABEL })).not.toBeInTheDocument();
  });

  it('shows the columns and rows of the new type when the type changes', async () => {
    const { showType } = renderResults(createFixtureEntityInventoryApiClient());
    expect(
      await screen.findByTestId('dataGridHeaderCell-entityInventory.name')
    ).toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-cloud.account.id')).toBeInTheDocument();

    showType('k8s.deployment');

    await waitFor(() =>
      expect(screen.getByTestId('entityInventoryTable')).toHaveAttribute(
        'data-entity-type',
        'k8s.deployment'
      )
    );
    expect(screen.getByTestId('dataGridHeaderCell-entityInventory.namespace')).toBeInTheDocument();
    expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument();
  });

  it('keeps the rows up with a progress bar while a new range loads', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    let finishReload: () => void = () => {};
    const getEntities = jest
      .fn(fixtureClient.getEntities)
      .mockImplementationOnce(fixtureClient.getEntities)
      .mockImplementationOnce(
        (...args) =>
          new Promise((resolve) => {
            finishReload = () => resolve(fixtureClient.getEntities(...args));
          })
      );
    renderResults({ ...fixtureClient, getEntities });
    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTableReloading')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: NEW_RANGE_LABEL }));

    expect(await screen.findByTestId('entityInventoryTableReloading')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTableLoading')).not.toBeInTheDocument();

    finishReload();

    await waitFor(() =>
      expect(screen.queryByTestId('entityInventoryTableReloading')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
  });

  describe('column and sort choices', () => {
    const hideColumn = (columnId: string) => {
      fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${columnId}`));
      const hide = within(screen.getByTestId(`dataGridHeaderCellActionGroup-${columnId}`))
        .getAllByRole('button')
        .find((button) => button.textContent === 'Hide column');
      if (!hide) {
        throw new Error('No hide action');
      }
      fireEvent.click(hide);
    };

    it('survive a range with no entities and a failed reload of the same type', async () => {
      const fixtureClient = createFixtureEntityInventoryApiClient();
      const emptyClient = createScenarioEntityInventoryApiClient({ scenario: 'empty' });
      const getEntities = jest
        .fn(fixtureClient.getEntities)
        .mockImplementationOnce(fixtureClient.getEntities)
        .mockImplementationOnce(emptyClient.getEntities)
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockImplementation(fixtureClient.getEntities);
      renderResults({ ...fixtureClient, getEntities });
      expect(await screen.findByTestId('dataGridHeaderCell-cloud.account.id')).toBeInTheDocument();
      hideColumn('cloud.account.id');
      await waitFor(() =>
        expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument()
      );

      fireEvent.click(screen.getByRole('button', { name: NEW_RANGE_LABEL }));
      expect(await screen.findByTestId('entityInventoryTableEmpty')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: NEW_RANGE_LABEL }));
      expect(await screen.findByTestId('entityInventoryTableError')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));

      expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridHeaderCell-entityInventory.name')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument();
    });

    it('survive a switch to another type and back', async () => {
      const { showType } = renderResults(createFixtureEntityInventoryApiClient());
      expect(await screen.findByTestId('dataGridHeaderCell-cloud.account.id')).toBeInTheDocument();
      hideColumn('cloud.account.id');
      await waitFor(() =>
        expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument()
      );

      showType('k8s.deployment');
      expect(
        await screen.findByTestId('dataGridHeaderCell-entityInventory.namespace')
      ).toBeInTheDocument();
      showType('host');

      expect(await screen.findByTestId('dataGridHeaderCell-last_seen')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCell-cloud.account.id')).not.toBeInTheDocument();
    });
  });

  it('shows the error, not the previous results, when a later load fails', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const getEntities = jest
      .fn(fixtureClient.getEntities)
      .mockImplementationOnce(fixtureClient.getEntities)
      .mockRejectedValueOnce(new Error('Request failed'));
    renderResults({ ...fixtureClient, getEntities });
    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: NEW_RANGE_LABEL }));

    expect(await screen.findByTestId('entityInventoryTableError')).toHaveTextContent(
      'Request failed'
    );
    expect(screen.queryByTestId('entityInventoryTable')).not.toBeInTheDocument();
  });
});
