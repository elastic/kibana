/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HISTORICAL_RESULTS_TOUR_SELECTOR_KEY } from '../constants';
import { HistoricalResultsTour } from '.';
import { INTRODUCING_DATA_QUALITY_HISTORY, VIEW_PAST_RESULTS } from './translations';

const anchorSelectorValue = 'test-anchor';

describe('HistoricalResultsTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given no anchor element', () => {
    it('does not render the tour step', () => {
      render(
        <HistoricalResultsTour
          anchorSelectorValue={anchorSelectorValue}
          onTryIt={jest.fn()}
          isOpen={true}
          onDismissTour={jest.fn()}
        />
      );

      expect(screen.queryByText(INTRODUCING_DATA_QUALITY_HISTORY)).not.toBeInTheDocument();
    });
  });

  describe('given an anchor element', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-unsanitized/property
      document.body.innerHTML = `<div ${HISTORICAL_RESULTS_TOUR_SELECTOR_KEY}="${anchorSelectorValue}"></div>`;
    });

    describe('when isOpen is true', () => {
      const onTryIt = jest.fn();
      const onDismissTour = jest.fn();
      beforeEach(() => {
        render(
          <HistoricalResultsTour
            anchorSelectorValue={anchorSelectorValue}
            onTryIt={onTryIt}
            isOpen={true}
            onDismissTour={onDismissTour}
          />
        );
      });
      it('renders the tour step', async () => {
        expect(
          await screen.findByRole('dialog', { name: INTRODUCING_DATA_QUALITY_HISTORY })
        ).toBeInTheDocument();
        expect(screen.getByText(INTRODUCING_DATA_QUALITY_HISTORY)).toBeInTheDocument();
        expect(screen.getByText(VIEW_PAST_RESULTS)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Try It/i })).toBeInTheDocument();

        const historicalResultsTour = screen.getByTestId('historicalResultsTour');
        expect(historicalResultsTour.querySelector('[data-tour-element]')).toHaveAttribute(
          'data-tour-element',
          anchorSelectorValue
        );
      });

      describe('when the close button is clicked', () => {
        it('calls dismissTour', async () => {
          await userEvent.click(await screen.findByRole('button', { name: /Close/i }));
          expect(onDismissTour).toHaveBeenCalledTimes(1);
        });
      });

      describe('when the try it button is clicked', () => {
        it('calls onTryIt', async () => {
          await userEvent.click(await screen.findByRole('button', { name: /Try It/i }));
          expect(onTryIt).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when isOpen is false', () => {
      it('does not render the tour step', async () => {
        render(
          <HistoricalResultsTour
            anchorSelectorValue={anchorSelectorValue}
            onTryIt={jest.fn()}
            isOpen={false}
            onDismissTour={jest.fn()}
          />
        );

        await waitFor(() =>
          expect(screen.queryByText(INTRODUCING_DATA_QUALITY_HISTORY)).not.toBeInTheDocument()
        );
      });
    });
  });
});
