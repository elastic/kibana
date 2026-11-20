/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { HOST_TYPE_FIXTURE } from '../../../__fixtures__/inventory_data';
import { installIntersectionObserverMock } from '../../../__fixtures__/intersection_observer_mock';
import type { IntersectionObserverMockControls } from '../../../__fixtures__/intersection_observer_mock';
import { createScenarioEntityInventoryApiClient } from '../../../__fixtures__/inventory_scenarios';
import type { FixtureScenario } from '../../../__fixtures__/inventory_scenarios';
import { createAppServicesMock } from '../../../mocks';
import { EntityTablePreferencesProvider } from '../../context/entity_table_preferences_context';
import { EntityInventorySearchProvider } from '../../context/search_context';
import { EntitySection } from './entity_section';

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
  // Installed before `render` so a request made on mount is counted, and calls through.
  const getEntities = jest.spyOn(inventoryApi, 'getEntities');
  const history = createMemoryHistory();
  const section = (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={createAppServicesMock({ inventoryApi })}>
          <EntityTablePreferencesProvider>
            <Router history={history}>
              <EntityInventorySearchProvider entityCategory="hosts">
                <EntitySection entityType={entityType} onTruncatedChange={onTruncatedChange} />
              </EntityInventorySearchProvider>
            </Router>
          </EntityTablePreferencesProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const { rerender, unmount } = render(section);
  return { rerenderSection: () => rerender(section), unmount, getEntities };
};

describe('EntitySection', () => {
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
  describe('loading when near the viewport', () => {
    let observer: IntersectionObserverMockControls;

    beforeEach(() => {
      observer = installIntersectionObserverMock();
    });

    afterEach(() => {
      observer.restore();
    });

    it('does not request its list, and shows the skeleton with no count, until it is near the viewport', async () => {
      const { getEntities } = renderSection({ scenario: 'normal', onTruncatedChange: jest.fn() });

      expect(getEntities).not.toHaveBeenCalled();
      expect(await screen.findByTestId('entityInventoryTableSkeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('entityInventoryTypeSectionCount')).not.toBeInTheDocument();
      expect(getEntities).not.toHaveBeenCalled();
    });

    it('requests its list once when it comes near the viewport, and shows the count', async () => {
      const { getEntities } = renderSection({ scenario: 'normal', onTruncatedChange: jest.fn() });
      expect(getEntities).not.toHaveBeenCalled();

      act(() => observer.setIntersecting(screen.getByTestId('entityInventoryTypeSection'), true));

      expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();
      expect(screen.getByTestId('entityInventoryTypeSectionCount')).toBeInTheDocument();
      expect(getEntities).toHaveBeenCalledTimes(1);
    });

    it('keeps its list, without another request, when it scrolls out of range and back', async () => {
      const { getEntities } = renderSection({ scenario: 'normal', onTruncatedChange: jest.fn() });
      expect(getEntities).not.toHaveBeenCalled();
      const section = screen.getByTestId('entityInventoryTypeSection');
      act(() => observer.setIntersecting(section, true));
      expect(await screen.findByTestId('entityInventoryTable')).toBeInTheDocument();

      act(() => observer.setIntersecting(section, false));
      act(() => observer.setIntersecting(section, true));

      expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
      expect(getEntities).toHaveBeenCalledTimes(1);
    });

    it('reports no truncation while it has not loaded', () => {
      const onTruncatedChange = jest.fn();
      renderSection({ scenario: 'truncated', onTruncatedChange });

      expect(onTruncatedChange).not.toHaveBeenCalled();
    });
  });
});
