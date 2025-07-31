/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import {
  generateMockFileIndicator,
  type Indicator,
} from '../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { AddToNewCase } from './add_to_new_case';

const TEST_ID = 'test';
const indicator: Indicator = generateMockFileIndicator();
const onClick = () => window.alert('clicked');

describe('AddToNewCase', () => {
  it('should render an EuiContextMenuItem', () => {
    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <AddToNewCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add to new case')).toHaveLength(1);
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
        <AddToNewCase indicator={indicatorMissingName} onClick={onClick} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });

  it('should render the EuiContextMenuItem disabled if user have no create permission', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <AddToNewCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });
});
