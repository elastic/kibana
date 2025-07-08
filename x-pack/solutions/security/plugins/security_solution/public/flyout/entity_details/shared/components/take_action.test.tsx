/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TakeAction } from './take_action';
import { TestProviders } from '../../../../common/mock';

describe('<TakeAction />', () => {
  const kqlQuery = 'host.name: "test-host"';

  it('renders the Take Action button', () => {
    const { getByText } = render(<TakeAction kqlQuery={kqlQuery} />, {
      wrapper: TestProviders,
    });
    expect(getByText('Take action')).toBeInTheDocument();
  });

  it('disables the button when isDisabled is true', () => {
    const { getByRole } = render(<TakeAction kqlQuery={kqlQuery} isDisabled />, {
      wrapper: TestProviders,
    });
    const button = getByRole('button', { name: /take action/i });
    expect(button).toBeDisabled();
  });
});
