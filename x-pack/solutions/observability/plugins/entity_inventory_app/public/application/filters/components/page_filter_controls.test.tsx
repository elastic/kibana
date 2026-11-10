/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryEntityCategory } from '../../../types';
import { EntityInventorySearchProvider } from '../../context/search_context';
import { typesFixture as mockTypes } from '../../__fixtures__/types';
import { EntityInventoryPageFilterControls } from './page_filter_controls';

jest.mock('../../hooks/use_entity_inventory_types', () => ({
  useEntityInventoryTypes: () => ({ types: mockTypes }),
}));
jest.mock('../hooks/use_attribute_values', () => ({
  useAttributeValues: () => ({ values: ['one', 'two'], invalidSelections: [], isLoading: false }),
}));

const renderControls = (entityCategory: EntityInventoryEntityCategory) =>
  render(
    <KibanaContextProvider services={coreMock.createStart()}>
      <Router history={createMemoryHistory()}>
        <EntityInventorySearchProvider entityCategory={entityCategory}>
          <EntityInventoryPageFilterControls />
        </EntityInventorySearchProvider>
      </Router>
    </KibanaContextProvider>
  );

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
});
