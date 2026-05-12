/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Footer } from './footer';
import { generateMockIndicator } from '../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../common/mock';
import { IOC_DETAILS_FOOTER_TEST_ID } from './test_ids';

describe('<Footer />', () => {
  it('should render the footer with take action button', () => {
    const { getByTestId, getAllByText } = render(
      <TestProviders>
        <Footer indicator={generateMockIndicator()} />
      </TestProviders>
    );

    expect(getByTestId(IOC_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Take action')).toHaveLength(1);
  });
});
