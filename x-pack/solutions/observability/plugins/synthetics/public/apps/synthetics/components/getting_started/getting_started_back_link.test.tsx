/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { GettingStartedBackLink } from './getting_started_back_link';

describe('GettingStartedBackLink', () => {
  it('renders Back to selection when arriving from Add Data', () => {
    const { getByRole } = render(<GettingStartedBackLink />, {
      url: '/monitors/getting-started?returnAppId=observabilityOnboarding&returnPath=%3F',
      core: {
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path ?? ''}`,
        },
      },
    });

    const link = getByRole('link', { name: 'Back to selection' });
    expect(link).toHaveAttribute('href', '/app/observabilityOnboarding?');
  });

  it('renders nothing without the return params', () => {
    const { queryByText } = render(<GettingStartedBackLink />, {
      url: '/monitors/getting-started',
    });

    expect(queryByText('Back to selection')).not.toBeInTheDocument();
  });
});
