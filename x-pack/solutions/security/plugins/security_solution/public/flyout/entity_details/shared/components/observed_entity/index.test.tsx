/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ObservedEntity } from '.';
import { TestProviders } from '../../../../../common/mock';
import { mockObservedHostData } from '../../../mocks';

describe('ObservedHost', () => {
  const mockProps = {
    observedData: mockObservedHostData,
    contextID: '',
    scopeId: '',
    queryId: 'TEST_QUERY_ID',
    observedFields: [],
  };

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedEntity {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedEntity-accordion')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedEntity {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedEntity-accordion')).toHaveTextContent('Updated Feb 23, 2023');
  });
});
