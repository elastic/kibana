/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, act, renderHook } from '@testing-library/react';
import { of } from 'rxjs';

import { siemGuideId } from '../../../../common/guided_onboarding/siem_guide_config';
import { TourContextProvider, useTourContext } from './tour';
import { type AlertsCasesTourSteps, SecurityStepId, securityTourConfig } from './tour_config';
import { useKibana } from '../../lib/kibana';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }),
  };
});

describe('useTourContext', () => {
  const mockCompleteGuideStep = jest.fn();
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        guidedOnboarding: {
          guidedOnboardingApi: {
            isGuideStepActive$: () => of(true),
            completeGuideStep: mockCompleteGuideStep,
          },
        },
      },
    });
    jest.clearAllMocks();
  });
  // @ts-ignore
  const tourIds = [SecurityStepId.alertsCases];
  describe.each(tourIds)('%s', (tourId: SecurityStepId) => {
    it('if guidedOnboardingApi?.isGuideStepActive$ is false, isTourShown should be false', async () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          guidedOnboarding: {
            guidedOnboardingApi: {
              isGuideStepActive$: () => of(false),
            },
          },
        },
      });
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      await waitFor(() => {
        expect(result.current.isTourShown(tourId)).toBe(false);
      });
    });
    it('if guidedOnboardingApi?.isGuideStepActive$ is true, isTourShown should be true', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      await waitFor(() => {
        expect(result.current.isTourShown(tourId)).toBe(true);
      });
    });
    it('endTourStep calls completeGuideStep with correct tourId', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      act(() => {
        result.current.endTourStep(tourId);
      });
      await waitFor(() => {
        expect(mockCompleteGuideStep).toHaveBeenCalledWith(siemGuideId, tourId);
      });
    });
    it('activeStep is initially 1', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      await waitFor(() => {
        expect(result.current.activeStep).toBe(1);
      });
    });
    it('incrementStep properly increments for each tourId, and if attempted to increment beyond length of tour config steps resets activeStep to 1', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      const stepCount = securityTourConfig[tourId].length;
      act(() => {
        for (let i = 0; i < stepCount - 1; i++) {
          result.current.incrementStep(tourId);
        }
      });
      const lastStep = stepCount ? stepCount : 1;
      await waitFor(() => {
        expect(result.current.activeStep).toBe(lastStep);
      });
      act(() => {
        result.current.incrementStep(tourId);
      });
      await waitFor(() => {
        expect(result.current.activeStep).toBe(1);
      });
    });

    it('setStep sets activeStep to step number argument', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      act(() => {
        result.current.setStep(tourId, 6);
      });
      await waitFor(() => {
        expect(result.current.activeStep).toBe(6);
      });
    });

    it('does not setStep sets activeStep to non-existing step number', async () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });

      act(() => {
        result.current.setStep(tourId, 88 as AlertsCasesTourSteps);
      });
      await waitFor(() => {
        expect(result.current.activeStep).toBe(1);
      });
    });
  });
});
