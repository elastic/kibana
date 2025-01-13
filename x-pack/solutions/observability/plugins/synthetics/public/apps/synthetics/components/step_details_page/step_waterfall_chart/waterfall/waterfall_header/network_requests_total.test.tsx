/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NetworkRequestsTotal } from './network_requests_total';
import { render } from '../../../../../utils/testing';

describe('NetworkRequestsTotal', () => {
  it('message in case total is greater than fetched', () => {
    const { getByTestId, getByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={1000}
        totalNetworkRequests={1100}
        highlightedNetworkRequests={1000}
      />
    );

    expect(getByText('Info')).toBeInTheDocument();
    expect(getByTestId('syntheticsWaterfallChartCountShown')).toHaveTextContent('1,000');
    expect(getByText(/of 1,100/i)).toBeInTheDocument();
  });

  it('message in case total is equal to fetched requests', () => {
    const { getByTestId, queryByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={500}
        totalNetworkRequests={500}
        highlightedNetworkRequests={500}
      />
    );

    expect(queryByText('Info')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsWaterfallChartCountShown')).toHaveTextContent('500');
    expect(queryByText(/of 500/i)).toBeInTheDocument();
  });
});
