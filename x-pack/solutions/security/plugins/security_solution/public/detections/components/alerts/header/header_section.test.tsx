/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { GO_TO_RULES_BUTTON_TEST_ID, HeaderSection } from './header_section';

describe('HeaderSection', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderSection />
      </TestProviders>
    );

    expect(getByTestId(GO_TO_RULES_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should omit manage rules button when showManageRulesButton is false', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <HeaderSection showManageRulesButton={false} />
      </TestProviders>
    );

    expect(queryByTestId(GO_TO_RULES_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
