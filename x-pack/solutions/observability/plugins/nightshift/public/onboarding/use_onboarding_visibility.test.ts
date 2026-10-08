/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useFetchAutomations } from '../automations/hooks/use_automations';
import { useFetchInvestigations } from '../hooks/use_fetch_investigations';
import { useOnboardingVisibility } from './use_onboarding_visibility';

jest.mock('../automations/hooks/use_automations');
jest.mock('../hooks/use_fetch_investigations');

const mockUseFetchAutomations = useFetchAutomations as jest.Mock;
const mockUseFetchInvestigations = useFetchInvestigations as jest.Mock;

const investigation = { investigation_id: 'inv-1', status: 'running' };

const setup = ({
  automations = [],
  investigations = [],
  isEnabled = true,
  canUseAutomations = true,
  forceOnboarding = false,
}: {
  automations?: unknown[];
  investigations?: unknown[];
  isEnabled?: boolean;
  canUseAutomations?: boolean;
  forceOnboarding?: boolean;
} = {}) => {
  mockUseFetchAutomations.mockReturnValue({
    data: { automations },
    isInitialLoading: false,
    isError: false,
  });
  mockUseFetchInvestigations.mockReturnValue({
    investigations,
    isInitialLoading: false,
    error: null,
  });
  return renderHook(() =>
    useOnboardingVisibility({ isEnabled, canUseAutomations, forceOnboarding })
  );
};

describe('useOnboardingVisibility', () => {
  it('onboards a space without automations, even with investigations', () => {
    const { result } = setup({ investigations: [investigation] });
    expect(result.current.showOnboarding).toBe(true);
    expect(result.current.latestInvestigation).toBe(investigation);
  });

  it('is done once the space has an automation', () => {
    const { result } = setup({ automations: [{ id: 'a-1' }] });
    expect(result.current.showOnboarding).toBe(false);
  });

  it('forces onboarding with an automation', () => {
    const { result } = setup({ automations: [{ id: 'a-1' }], forceOnboarding: true });
    expect(result.current.showOnboarding).toBe(true);
  });

  it('falls back to "has an investigation" without automations', () => {
    expect(setup({ canUseAutomations: false }).result.current.showOnboarding).toBe(true);
    expect(
      setup({ canUseAutomations: false, investigations: [investigation] }).result.current
        .showOnboarding
    ).toBe(false);
  });

  it('never onboards when disabled', () => {
    expect(setup({ isEnabled: false, forceOnboarding: true }).result.current.showOnboarding).toBe(
      false
    );
  });

  it('hides onboarding after dismiss', () => {
    const { result } = setup({ forceOnboarding: true });
    act(() => result.current.dismiss());
    expect(result.current.showOnboarding).toBe(false);
  });
});
