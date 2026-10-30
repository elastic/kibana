/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryApiClient } from '../../../inventory_api/client';
import type { FixtureScenario } from '../../../inventory_api/fixture_client';
import { createFixtureEntityInventoryApiClient } from '../../../inventory_api/fixture_client';
import { HOST_TYPE_FIXTURE } from '../../../inventory_api/fixture_data';
import { createAppServicesMock } from '../../../mocks';
import { EntityInventorySearchProvider } from '../../context/search_context';
import { EntityTypeResults } from './entity_type_results';
import {
  EMPTY_BODY,
  LOAD_ERROR_TITLE,
  RETRY_LABEL,
  getEmptyTitle,
  getTruncationTitle,
  getTruncationTotalUnknownTitle,
  getTypeNotAvailableTitle,
} from './translations';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

const renderResults = (inventoryApi: EntityInventoryApiClient, entityType = 'host') =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
          <EntityInventorySearchProvider entityCategory="hosts">
            <EntityTypeResults entityType={entityType} />
          </EntityInventorySearchProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

const renderScenario = (scenario: FixtureScenario) =>
  renderResults(createFixtureEntityInventoryApiClient({ scenario }));

describe('EntityTypeResults', () => {
  it('shows a loading prompt until the entities arrive, then the table', async () => {
    renderScenario('normal');

    expect(screen.getByTestId('entityInventoryTableLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('entityInventoryTable')).toHaveAttribute(
      'data-entity-type',
      'host'
    );
    expect(screen.getByTestId('entityInventoryTableSummary')).toBeInTheDocument();
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

    expect(await screen.findByTestId('entityInventoryTableEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryDiagnosticsCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTruncationCallout')).not.toBeInTheDocument();
  });

  it('shows the error with a retry that lists again', async () => {
    const fixtureClient = createFixtureEntityInventoryApiClient();
    const listEntities = jest
      .fn(fixtureClient.listEntities)
      .mockRejectedValueOnce(new Error('Request failed'));
    renderResults({ ...fixtureClient, listEntities });

    const error = await screen.findByTestId('entityInventoryTableError');
    expect(error).toHaveTextContent(LOAD_ERROR_TITLE);
    expect(error).toHaveTextContent('Request failed');

    fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));

    expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(listEntities).toHaveBeenCalledTimes(2);
  });

  it('says the type is not available when it is not registered, without a retry', async () => {
    renderResults(createFixtureEntityInventoryApiClient(), 'service');

    expect(await screen.findByTestId('entityInventoryTypeNotAvailable')).toHaveTextContent(
      getTypeNotAvailableTitle('service')
    );
    expect(screen.queryByRole('button', { name: RETRY_LABEL })).not.toBeInTheDocument();
  });
});
