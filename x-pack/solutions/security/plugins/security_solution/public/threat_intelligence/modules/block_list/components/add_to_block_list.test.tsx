/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToBlockListContextMenu } from './add_to_block_list';
import { BlockListProvider } from '../../indicators/containers/block_list_provider';
import { I18nProvider } from '@kbn/i18n-react';
import { TestProvidersComponent } from '../../../mocks/test_providers';
const TEST_ID = 'test';

describe('<AddToBlockListContextMenu />', () => {
  it('should render an EuiContextMenuItem', () => {
    const mockIndicatorFileHashValue: string = 'abc';
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <I18nProvider>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </I18nProvider>
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add blocklist entry')).toHaveLength(1);
  });

  it('should render a disabled EuiContextMenuItem if data is null', () => {
    const mockIndicatorFileHashValue = null;
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId } = render(
      <TestProvidersComponent>
        <I18nProvider>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </I18nProvider>
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });

  it('should render a disabled EuiContextMenuItem if no write blocklist privilege', () => {
    const mockIndicatorFileHashValue: string = 'abc';
    const mockOnClick: () => void = () => window.alert('clicked!');

    const { getByTestId } = render(
      <TestProvidersComponent>
        <I18nProvider>
          <BlockListProvider>
            <AddToBlockListContextMenu
              data={mockIndicatorFileHashValue}
              onClick={mockOnClick}
              data-test-subj={TEST_ID}
            />
          </BlockListProvider>
        </I18nProvider>
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });
});
