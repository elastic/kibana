/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../utils/testing/rtl_helpers';
import { MetricItemExtra } from './metric_item_extra';
import { fireEvent, waitFor } from '@testing-library/dom';

describe('<MetricItemExtra />', () => {
  it('renders the tooltip when there is content', async () => {
    const { getByText } = render(
      <MetricItemExtra
        stats={{ medianDuration: 10, avgDuration: 10, minDuration: 5, maxDuration: 15 }}
      />
    );
    expect(getByText('Duration')).toBeInTheDocument();
    fireEvent.mouseOver(getByText('Info'));
    await waitFor(() => expect(getByText('Median duration of last 50 checks')).toBeInTheDocument());
  });

  it('renders the empty tooltip when there is no content', async () => {
    const { getByText } = render(
      <MetricItemExtra
        stats={{
          medianDuration: null,
          avgDuration: null,
          minDuration: null,
          maxDuration: null,
        }}
      />
    );
    expect(getByText('Duration')).toBeInTheDocument();
    fireEvent.mouseOver(getByText('Info'));
    await waitFor(() => expect(getByText('Metric data is not available')).toBeInTheDocument());
  });
});
