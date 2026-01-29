/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { IndicatorBlock } from './block';
import { generateMockIndicator } from '../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../common/mock';

const mockIndicator = generateMockIndicator();

describe('IndicatorBlock', () => {
  it('should render field and value', () => {
    const { getByText } = render(
      <TestProviders>
        <IndicatorBlock field="threat.indicator.ip" indicator={mockIndicator} />
      </TestProviders>
    );

    expect(getByText('threat.indicator.ip')).toBeInTheDocument();
    expect(getByText('0.0.0.0')).toBeInTheDocument();
  });

  it('should render translated field and value', () => {
    const { getByText } = render(
      <TestProviders>
        <IndicatorBlock field="threat.indicator.name" indicator={mockIndicator} />
      </TestProviders>
    );

    expect(getByText('Indicator')).toBeInTheDocument();
    expect(getByText('0.0.0.0')).toBeInTheDocument();
  });
});
