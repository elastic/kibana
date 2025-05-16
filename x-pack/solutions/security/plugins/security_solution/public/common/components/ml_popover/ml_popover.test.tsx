/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';

import { MlPopover } from './ml_popover';
import { TestProviders } from '../../mock';

jest.mock('../../lib/kibana');

describe('MlPopover', () => {
  test('shows upgrade popover on mouse click', async () => {
    const { getByTestId } = render(<MlPopover />, {
      wrapper: TestProviders,
    });

    await act(async () => {
      getByTestId('integrations-button').click();
    });

    expect(getByTestId('ml-popover-upgrade-contents')).toBeInTheDocument();
  });
});
