/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorPage } from './monitor';
import { render } from '../lib/helper/rtl_helpers';

describe('MonitorPage', () => {
  it('renders', async () => {
    const { findByText } = render(<MonitorPage />);

    expect(await findByText('Up in 0 location')).toBeInTheDocument();
    expect(await findByText('Overall availability')).toBeInTheDocument();
    expect(await findByText('0.00 %')).toBeInTheDocument();
    expect(await findByText('Url')).toBeInTheDocument();
    expect(await findByText('Monitor ID')).toBeInTheDocument();
    expect(await findByText('Tags')).toBeInTheDocument();
    expect(await findByText('Set tags')).toBeInTheDocument();
    expect(await findByText('Monitoring from')).toBeInTheDocument();
  });
});
