/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import {
  ADVANCED_ENTITY_ANALYTICS_DOCS_URL,
  PRODUCT_TOUR_BANNER_TEST_ID,
  PRODUCT_TOUR_DISMISS_TEST_ID,
  PRODUCT_TOUR_DOCS_TEST_ID,
  PRODUCT_TOUR_START_TEST_ID,
} from './constants';
import { ProductTourBanner } from './product_tour_banner';

describe('ProductTourBanner', () => {
  const onStartTour = jest.fn();
  const onDismiss = jest.fn();

  const renderBanner = () =>
    render(
      <TestProviders>
        <ProductTourBanner onStartTour={onStartTour} onDismiss={onDismiss} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and text', () => {
    renderBanner();

    const banner = screen.getByTestId(PRODUCT_TOUR_BANNER_TEST_ID);
    expect(banner).toHaveTextContent('Smarter Entity analytics to kick off your hunt');
    expect(banner).toHaveTextContent('Take a short tour, or dive in.');
  });

  it('starts the tour from the primary action', () => {
    renderBanner();

    fireEvent.click(screen.getByTestId(PRODUCT_TOUR_START_TEST_ID));

    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it('links to the Advanced Entity Analytics docs in a new tab', () => {
    renderBanner();

    const docsLink = screen.getByTestId(PRODUCT_TOUR_DOCS_TEST_ID);
    expect(docsLink).toHaveAttribute('href', ADVANCED_ENTITY_ANALYTICS_DOCS_URL);
    expect(docsLink).toHaveAttribute('target', '_blank');
  });

  it('dismisses the banner', () => {
    renderBanner();

    fireEvent.click(screen.getByTestId(PRODUCT_TOUR_DISMISS_TEST_ID));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
