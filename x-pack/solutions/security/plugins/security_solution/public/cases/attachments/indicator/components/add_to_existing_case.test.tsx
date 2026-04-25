/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToExistingCase } from './add_to_existing_case';
import { TestProvidersComponent } from '../../../../threat_intelligence/mocks/test_providers';
import {
  generateMockFileIndicator,
  type Indicator,
} from '../../../../../common/threat_intelligence/types/indicator';

const TEST_ID = 'test';
const indicator: Indicator = generateMockFileIndicator();
const onClick = () => window.alert('clicked');

describe('AddToExistingCase', () => {
  it('should render an EuiContextMenuItem', () => {
    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToExistingCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add to existing case')).toHaveLength(1);
  });

  it('should render the EuiContextMenuItem disabled if indicator is missing name', () => {
    const fields = { ...indicator.fields };
    delete fields['threat.indicator.name'];
    const indicatorMissingName = {
      _id: indicator._id,
      fields,
    };
    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToExistingCase
          indicator={indicatorMissingName}
          onClick={onClick}
          data-test-subj={TEST_ID}
        />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });

  it('should render the EuiContextMenuItem disabled if user has no update permission', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToExistingCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });
});
