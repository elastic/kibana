/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { HUNT_WITH_AI_BUTTON_TEST_ID } from '../hunt_with_ai_button';
import {
  ANCHOR_TIMEOUT_MS,
  PRODUCT_TOUR_CLOSE_TEST_ID,
  PRODUCT_TOUR_FINISH_TEST_ID,
  PRODUCT_TOUR_NEXT_TEST_ID,
  PRODUCT_TOUR_STEPS,
  ROWS_MODE_SELECTOR_TEST_ID,
  SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID,
  getProductTourStepTestId,
} from './constants';
import { ProductTour } from './product_tour';

const ALL_ANCHORS = [
  SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID,
  HUNT_WITH_AI_BUTTON_TEST_ID,
  ROWS_MODE_SELECTOR_TEST_ID,
];

const renderTour = ({
  currentStep,
  anchors = ALL_ANCHORS,
  steps = PRODUCT_TOUR_STEPS,
}: {
  currentStep: number;
  anchors?: string[];
  steps?: typeof PRODUCT_TOUR_STEPS;
}) => {
  const onNext = jest.fn();
  const onEnd = jest.fn();
  const utils = render(
    <TestProviders>
      {/* The tour moves its anchor into the popover, so anchors need a parent React can remove instead. */}
      <div>
        {anchors.map((testId) => (
          <button key={testId} type="button" data-test-subj={testId} />
        ))}
      </div>
      <ProductTour steps={steps} currentStep={currentStep} onNext={onNext} onEnd={onEnd} />
    </TestProviders>
  );
  return { ...utils, onNext, onEnd };
};

describe('ProductTour', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when the tour is not running', () => {
    renderTour({ currentStep: 0 });

    expect(screen.queryByTestId(getProductTourStepTestId('attention'))).not.toBeInTheDocument();
  });

  it.each([
    [1, 'attention', 'Start with what needs attention'],
    [2, 'huntWithAi', 'Get a head start from AI'],
    [3, 'rows', 'Choose your level of detail'],
  ])('renders step %i (%s)', async (currentStep, stepId, title) => {
    renderTour({ currentStep });

    expect(await screen.findByTestId(getProductTourStepTestId(stepId))).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('moves to the next step', async () => {
    const { onNext } = renderTour({ currentStep: 1 });

    fireEvent.click(await screen.findByTestId(PRODUCT_TOUR_NEXT_TEST_ID));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('closes the tour before the last step', async () => {
    const { onEnd } = renderTour({ currentStep: 1 });

    fireEvent.click(await screen.findByTestId(PRODUCT_TOUR_CLOSE_TEST_ID));

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('finishes the tour on the last step', async () => {
    const { onEnd } = renderTour({ currentStep: 3 });

    expect(screen.queryByTestId(PRODUCT_TOUR_NEXT_TEST_ID)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId(PRODUCT_TOUR_FINISH_TEST_ID));

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('numbers only the steps it gets', async () => {
    const steps = PRODUCT_TOUR_STEPS.filter(({ id }) => id !== 'huntWithAi');
    renderTour({ currentStep: 2, steps });

    expect(await screen.findByTestId(getProductTourStepTestId('rows'))).toBeInTheDocument();
    expect(screen.getByLabelText('Step 2 active')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Step 3/)).not.toBeInTheDocument();
    expect(screen.getByTestId(PRODUCT_TOUR_FINISH_TEST_ID)).toBeInTheDocument();
  });

  it('skips a step whose anchor never renders', () => {
    jest.useFakeTimers();
    const { onNext } = renderTour({
      currentStep: 2,
      anchors: [SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID, ROWS_MODE_SELECTOR_TEST_ID],
    });

    expect(screen.queryByTestId(getProductTourStepTestId('huntWithAi'))).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(ANCHOR_TIMEOUT_MS);
    });

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
