/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryEntityCategory } from '../../../types';
import { createPublicConfigMock } from '../../../mocks';
import { EntityInventorySearchProvider } from '../../context/search_context';
import { useEntityInventoryDataView } from '../../hooks/use_entity_inventory_data_view';
import { typesFixture as mockTypes } from '../../__fixtures__/types';
import { EntityInventoryPageFilterControls } from './page_filter_controls';

jest.mock('../../hooks/use_entity_inventory_types', () => ({
  useEntityInventoryTypes: () => ({ types: mockTypes }),
}));
jest.mock('../hooks/use_attribute_values', () => ({
  useAttributeValues: () => ({ values: ['one', 'two'], invalidSelections: [], isLoading: false }),
}));

// Reads the data view like the search bar does, from the same shared selection.
const DataViewProbe = () => {
  useEntityInventoryDataView();
  return null;
};

const renderControls = (entityCategory: EntityInventoryEntityCategory, initialEntry = '/') => {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const dataViewsCreate = jest.fn().mockResolvedValue({});
  const result = render(
    <KibanaContextProvider
      services={{
        ...coreMock.createStart(),
        config: createPublicConfigMock(),
        dataViews: { create: dataViewsCreate },
      }}
    >
      <Router history={history}>
        <EntityInventorySearchProvider entityCategory={entityCategory}>
          <EntityInventoryPageFilterControls />
          <DataViewProbe />
        </EntityInventorySearchProvider>
      </Router>
    </KibanaContextProvider>
  );
  return { history, dataViewsCreate, ...result };
};

describe('EntityInventoryPageFilterControls', () => {
  it('shows the category filter on the all resources page', () => {
    renderControls('all');

    expect(screen.getByTestId('entityInventoryCategoryFilter')).toHaveTextContent('All categories');
  });

  it.each(['hosts', 'kubernetes'] as EntityInventoryEntityCategory[])(
    'hides the category filter on the %s page',
    (entityCategory) => {
      renderControls(entityCategory);

      expect(screen.queryByTestId('entityInventoryCategoryFilter')).not.toBeInTheDocument();
      expect(screen.getByTestId('entityInventoryFilterControls')).toBeInTheDocument();
    }
  );

  it('keeps the selection in the page search state', async () => {
    renderControls('all');

    await userEvent.click(screen.getByTestId('entityInventoryCategoryFilter'));
    await userEvent.click(await screen.findByText('Kubernetes'));

    expect(screen.getByTestId('entityInventoryCategoryFilter')).toHaveTextContent('Kubernetes');
    expect(screen.getByTestId('entityInventoryTypeFilter')).toBeInTheDocument();
  });

  describe('a stale selection in the URL', () => {
    const CLEAR = 'entityInventoryClearFilters';

    it('does not offer to clear filters for an attribute that is not in the view', () => {
      renderControls('hosts', '/hosts?_a=(filterControls:(attributes:(not.in.the.view:!(x))))');

      expect(screen.queryByTestId(CLEAR)).not.toBeInTheDocument();
    });

    it('does not offer to clear filters for an attribute with no selected values', () => {
      renderControls('hosts', '/hosts?_a=(filterControls:(attributes:(os.type:!())))');

      expect(screen.queryByTestId(CLEAR)).not.toBeInTheDocument();
    });

    it('shows no category that does not exist', () => {
      renderControls('all', '/all?_a=(filterControls:(attributes:(),category:nope))');

      expect(screen.getByTestId('entityInventoryCategoryFilter')).toHaveTextContent(
        'All categories'
      );
      expect(screen.queryByTestId(CLEAR)).not.toBeInTheDocument();
    });

    it('shows no type that does not exist and keeps the valid category', () => {
      renderControls(
        'all',
        '/all?_a=(filterControls:(attributes:(),category:kubernetes,type:nope))'
      );

      expect(screen.getByTestId('entityInventoryCategoryFilter')).toHaveTextContent('Kubernetes');
      expect(screen.getByTestId('entityInventoryTypeFilter')).toHaveTextContent('All types');
      expect(screen.getByTestId(CLEAR)).toBeInTheDocument();
    });

    it('keeps offering to clear filters for a valid selection', () => {
      renderControls('hosts', '/hosts?_a=(filterControls:(attributes:(os.type:!(linux))))');

      expect(screen.getByTestId(CLEAR)).toBeInTheDocument();
    });

    it('removes a category that does not exist from the URL once the types are known', async () => {
      const { history } = renderControls(
        'all',
        '/all?_a=(filterControls:(attributes:(),category:nope))'
      );

      await waitFor(() => expect(history.location.search).not.toContain('nope'));
    });

    it('removes an attribute that is not in the view from the URL and keeps the valid ones', async () => {
      const { history } = renderControls(
        'hosts',
        '/hosts?_a=(filterControls:(attributes:(os.type:!(linux),not.in.the.view:!(x))))'
      );

      await waitFor(() => expect(history.location.search).not.toContain('not.in.the.view'));
      expect(history.location.search).toContain('os.type');
    });

    it('does not change the URL for a valid selection', async () => {
      const entry = '/hosts?_a=(filterControls:(attributes:(os.type:!(linux))))';
      const { history } = renderControls('hosts', entry);

      await waitFor(() => expect(history.location.search).toContain('os.type'));
      expect(`/hosts${history.location.search}`).toContain(
        'filterControls:(attributes:(os.type:!(linux)))'
      );
    });

    it('gives the data view the index patterns of every type when the category in the URL does not exist', async () => {
      const { dataViewsCreate } = renderControls(
        'all',
        '/all?_a=(filterControls:(attributes:(),category:nope))'
      );

      await waitFor(() => expect(dataViewsCreate).toHaveBeenCalled());
      const titles = dataViewsCreate.mock.calls.map(([spec]) => spec.title);
      expect(titles.at(-1)).toBe(
        [...new Set(mockTypes.flatMap(({ sources }) => sources.map((s) => s.indexPattern)))]
          .sort()
          .join(',')
      );
    });
  });
});
