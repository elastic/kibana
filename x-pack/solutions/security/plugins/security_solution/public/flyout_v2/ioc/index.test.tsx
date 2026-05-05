/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { IOCDetails } from '.';
import { generateMockIndicator } from '../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../common/mock';
import { IOC_DETAILS_TITLE_TEST_ID, IOC_DETAILS_FOOTER_TEST_ID } from './test_ids';
import { noopCellActionRenderer } from '../shared/components/cell_actions';

const mockIndicator = generateMockIndicator();

const mockHit: DataTableRecord = {
  id: 'test-id',
  raw: { _id: 'test-id', fields: mockIndicator.fields },
  flattened: mockIndicator.fields as Record<string, unknown>,
};

describe('<IOCDetails />', () => {
  it('should render header, content, and footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <IOCDetails hit={mockHit} renderCellActions={noopCellActionRenderer} />
      </TestProviders>
    );

    expect(getByTestId(`${IOC_DETAILS_TITLE_TEST_ID}Text`)).toBeInTheDocument();
    expect(getByTestId(IOC_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
  });
});
