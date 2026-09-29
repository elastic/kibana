/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { ShowLicenseInfo } from './license_info';
import * as redux from 'react-redux-v7';
import { render } from '../../../lib/helper/rtl_helpers';

describe('ShowLicenseInfo', () => {
  beforeEach(() => {
    const spy = vi.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(vi.fn());

    const spy1 = vi.spyOn(redux, 'useSelector');
    spy1.mockReturnValue(true);
  });

  it('renders without errors', async () => {
    const { findAllByText } = render(<ShowLicenseInfo />);
    expect((await findAllByText('Start free 14-day trial'))[0]).toBeInTheDocument();
  });
});
