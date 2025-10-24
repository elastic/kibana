/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OpenIndicatorFlyoutButton } from './open_flyout_button';
import { generateMockIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { BUTTON_TEST_ID } from './test_ids';

const mockIndicator = generateMockIndicator();

describe('<IndicatorsFlyout />', () => {
  it('should render expand button', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} onOpen={jest.fn()} />
      </TestProvidersComponent>
    );

    expect(getByTestId(BUTTON_TEST_ID).innerHTML).toContain('expand');
  });
});
