/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOnboardingTelemetry } from './onboarding_telemetry';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { OnboardingHubEventTypes } from '../../common/lib/telemetry';
import type { OnboardingCardId } from '../constants';

jest.mock('../config', () => ({
  onboardingConfig: [
    { id: 'default', body: [{ cards: [{ id: 'testCard' }] }] },
    { id: 'testTopic', body: [{ cards: [{ id: 'testCard2' }] }] },
  ],
}));

jest.mock('../../common/lib/kibana/kibana_react');
const telemetryMock = { reportEvent: jest.fn() };
(useKibana as jest.Mock).mockReturnValue({
  services: { telemetry: telemetryMock },
});

describe('useOnboardingTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when opening a card', () => {
    it('should report card open event on default topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardOpen('testCard' as OnboardingCardId);

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepOpen,
        { stepId: 'testCard', trigger: 'click' }
      );
    });

    it('should report card open event on another topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardOpen('testCard2' as OnboardingCardId);
      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepOpen,
        { stepId: 'testTopic#testCard2', trigger: 'click' }
      );
    });

    it('should report card auto open event', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardOpen('testCard' as OnboardingCardId, { auto: true });
      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepOpen,
        { stepId: 'testCard', trigger: 'navigation' }
      );
    });
  });

  describe('when completing a card', () => {
    it('should report card complete event on the default topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardComplete('testCard' as OnboardingCardId);

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepFinished,
        { stepId: 'testCard', trigger: 'click' }
      );
    });

    it('should report card complete event on the another topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardComplete('testCard2' as OnboardingCardId);

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepFinished,
        { stepId: 'testTopic#testCard2', trigger: 'click' }
      );
    });

    it('should report card auto complete event', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardComplete('testCard' as OnboardingCardId, { auto: true });

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepFinished,
        { stepId: 'testCard', trigger: 'auto_check' }
      );
    });
  });

  describe('when clicking a card link', () => {
    it('should report card link clicked event on the default topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardLinkClicked('testCard' as OnboardingCardId, 'link1');

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepLinkClicked,
        { originStepId: 'testCard', stepLinkId: 'link1' }
      );
    });

    it('should report card link clicked event on another topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardLinkClicked('testCard2' as OnboardingCardId, 'link1');

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepLinkClicked,
        { originStepId: 'testTopic#testCard2', stepLinkId: 'link1' }
      );
    });
  });

  describe('when clicking a card selector', () => {
    it('should report card selector clicked event on the default topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardSelectorClicked('testCard' as OnboardingCardId, 'selector1');

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepSelectorClicked,
        { originStepId: 'testCard', selectorId: 'selector1' }
      );
    });

    it('should report card selector clicked event on another topic', () => {
      const { result } = renderHook(() => useOnboardingTelemetry());
      result.current.reportCardSelectorClicked('testCard2' as OnboardingCardId, 'selector2');

      expect(telemetryMock.reportEvent).toHaveBeenCalledWith(
        OnboardingHubEventTypes.OnboardingHubStepSelectorClicked,
        { originStepId: 'testTopic#testCard2', selectorId: 'selector2' }
      );
    });
  });
});
