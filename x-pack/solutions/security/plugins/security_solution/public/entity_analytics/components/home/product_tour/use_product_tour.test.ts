/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { useHuntWithAiAvailability } from '../use_hunt_with_ai_availability';
import { PRODUCT_TOUR_BANNER_STORAGE_KEY, PRODUCT_TOUR_STEPS } from './constants';
import { useProductTour } from './use_product_tour';

jest.mock('../../../../common/lib/kibana');
jest.mock('../use_hunt_with_ai_availability');

const useKibanaMock = useKibana as jest.Mock;
const useHuntWithAiAvailabilityMock = useHuntWithAiAvailability as jest.Mock;

const createStorageMock = (initial: Record<string, unknown> = {}) => {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => store.set(key, value)),
  };
};

let storage: ReturnType<typeof createStorageMock>;

const renderProductTour = ({
  dismissed = false,
  toursEnabled = true,
  huntWithAiAvailable = true,
}: { dismissed?: boolean; toursEnabled?: boolean; huntWithAiAvailable?: boolean } = {}) => {
  useHuntWithAiAvailabilityMock.mockReturnValue(huntWithAiAvailable);
  storage = createStorageMock(dismissed ? { [PRODUCT_TOUR_BANNER_STORAGE_KEY]: true } : {});
  useKibanaMock.mockReturnValue({
    services: {
      storage,
      notifications: { tours: { isEnabled: jest.fn(() => toursEnabled) } },
    },
  });
  return renderHook(() => useProductTour());
};

describe('useProductTour', () => {
  it('shows the banner when it was never dismissed', () => {
    const { result } = renderProductTour();

    expect(result.current.isBannerVisible).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });

  it('hides the banner when it was dismissed before', () => {
    const { result } = renderProductTour({ dismissed: true });

    expect(result.current.isBannerVisible).toBe(false);
  });

  it('hides the banner when tours are disabled', () => {
    const { result } = renderProductTour({ toursEnabled: false });

    expect(result.current.isBannerVisible).toBe(false);
  });

  it('stores the dismissal when the banner is dismissed', () => {
    const { result } = renderProductTour();

    act(() => result.current.dismissBanner());

    expect(result.current.isBannerVisible).toBe(false);
    expect(storage.set).toHaveBeenCalledWith(PRODUCT_TOUR_BANNER_STORAGE_KEY, true);
  });

  it('starts the tour and stores the banner dismissal', () => {
    const { result } = renderProductTour();

    act(() => result.current.startTour());

    expect(result.current.currentStep).toBe(1);
    expect(result.current.isBannerVisible).toBe(false);
    expect(storage.set).toHaveBeenCalledWith(PRODUCT_TOUR_BANNER_STORAGE_KEY, true);
  });

  it('starts the tour again after the banner was dismissed', () => {
    const { result } = renderProductTour({ dismissed: true });

    act(() => result.current.startTour());

    expect(result.current.currentStep).toBe(1);
  });

  it('ends the tour after the last step', () => {
    const { result } = renderProductTour();

    act(() => result.current.startTour());
    for (let step = 1; step < PRODUCT_TOUR_STEPS.length; step++) {
      act(() => result.current.nextStep());
      expect(result.current.currentStep).toBe(step + 1);
    }
    act(() => result.current.nextStep());

    expect(result.current.currentStep).toBe(0);
  });

  it('includes every step when hunt with AI is available', () => {
    const { result } = renderProductTour();

    expect(result.current.steps.map(({ id }) => id)).toEqual(['attention', 'huntWithAi', 'rows']);
  });

  it('drops the hunt with AI step when it is not available', () => {
    const { result } = renderProductTour({ huntWithAiAvailable: false });

    expect(result.current.steps.map(({ id }) => id)).toEqual(['attention', 'rows']);

    act(() => result.current.startTour());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(0);
  });

  it('ends the tour on request', () => {
    const { result } = renderProductTour();

    act(() => result.current.startTour());
    act(() => result.current.endTour());

    expect(result.current.currentStep).toBe(0);
  });
});
