/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { HOST_TYPE_FIXTURE } from '../../../__fixtures__/inventory_data';
import { createScenarioEntityInventoryApiClient } from '../../../__fixtures__/inventory_scenarios';
import type { FixtureScenario } from '../../../__fixtures__/inventory_scenarios';
import { createAppServicesMock } from '../../../mocks';
import { EntityTablePreferencesProvider } from '../../context/entity_table_preferences_context';
import { EntityInventorySearchProvider } from '../../context/search_context';
import { EntityTypeResults } from './entity_type_results';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

const renderSection = ({
  scenario,
  onTruncatedChange,
  entityType = HOST_TYPE_FIXTURE,
}: {
  scenario: FixtureScenario;
  onTruncatedChange: (truncated: boolean) => void;
  entityType?: InventoryType;
}) => {
  const inventoryApi = createScenarioEntityInventoryApiClient({ scenario });
  const section = (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
          <EntityTablePreferencesProvider>
            <EntityInventorySearchProvider entityCategory="hosts">
              <EntityTypeResults entityType={entityType} onTruncatedChange={onTruncatedChange} />
            </EntityInventorySearchProvider>
          </EntityTablePreferencesProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const { rerender, unmount } = render(section);
  return { rerenderSection: () => rerender(section), unmount };
};

describe('EntityTypeResults', () => {
  describe('truncation reporting', () => {
    it('reports the truncated list once, and not again on every render of the page', async () => {
      const onTruncatedChange = jest.fn();
      const { rerenderSection } = renderSection({
        scenario: 'truncated',
        onTruncatedChange,
      });

      await waitFor(() => expect(onTruncatedChange).toHaveBeenLastCalledWith(true));
      const callsWhenSettled = onTruncatedChange.mock.calls.length;

      // The page re-renders whenever another section reports its own truncation. This one has
      // nothing new to say, so it must stay quiet: a report per render is the loop, because every
      // report sets state on the page that renders this section.
      rerenderSection();
      rerenderSection();

      expect(onTruncatedChange).toHaveBeenCalledTimes(callsWhenSettled);
      expect(onTruncatedChange).toHaveBeenLastCalledWith(true);
    });

    it('takes its truncation back when the section leaves the page', async () => {
      const onTruncatedChange = jest.fn();
      const { unmount } = renderSection({ scenario: 'truncated', onTruncatedChange });

      await waitFor(() => expect(onTruncatedChange).toHaveBeenLastCalledWith(true));

      unmount();

      expect(onTruncatedChange).toHaveBeenLastCalledWith(false);
    });

    it('reports no truncation for a list that came back whole', async () => {
      const onTruncatedChange = jest.fn();
      renderSection({ scenario: 'normal', onTruncatedChange });

      expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
      expect(onTruncatedChange).not.toHaveBeenCalled();
    });
  });
});
