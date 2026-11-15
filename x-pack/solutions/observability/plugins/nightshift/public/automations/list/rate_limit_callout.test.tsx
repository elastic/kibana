/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RateLimitCallout } from './rate_limit_callout';

describe('RateLimitCallout', () => {
  it('shows the count and filters on click', () => {
    const onShow = jest.fn();
    render(
      <I18nProvider>
        <RateLimitCallout count={1} onShow={onShow} />
      </I18nProvider>
    );

    expect(screen.getByText('1 automation reached its daily trigger limit')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automationsShowRateLimited'));
    expect(onShow).toHaveBeenCalled();
  });
});
