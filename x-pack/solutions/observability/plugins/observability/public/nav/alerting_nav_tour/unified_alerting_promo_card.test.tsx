/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { UnifiedAlertingPromoCard } from './unified_alerting_promo_card';
import {
  ALERTING_NAV_PROMO_CARD_TEST_ID,
  ALERTING_NAV_PROMO_DISMISS_TEST_ID,
  ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID,
} from './constants';

jest.mock('./assets/alerting_promo_light.webp', () => 'promo-light.webp');
jest.mock('./assets/alerting_promo_dark.webp', () => 'promo-dark.webp');

describe('UnifiedAlertingPromoCard', () => {
  it('renders title, description, theme animation, and take-tour action', () => {
    const onTakeTour = jest.fn();
    const onDismiss = jest.fn();

    render(<UnifiedAlertingPromoCard onTakeTour={onTakeTour} onDismiss={onDismiss} />);

    expect(screen.getByTestId(ALERTING_NAV_PROMO_CARD_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Unified Alerting app')).toBeInTheDocument();
    expect(screen.getByText(/All your alerting features in one place/)).toBeInTheDocument();
    expect(['promo-light.webp', 'promo-dark.webp']).toContain(
      screen.getByTestId('alertingNavPromoCardImage').getAttribute('src')
    );

    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID));
    expect(onTakeTour).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_DISMISS_TEST_ID));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
