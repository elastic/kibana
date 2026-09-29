/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAssistantTelemetry } from '.';
import { AssistantEventTypes } from '../../common/lib/telemetry/events/ai_assistant/types';
import { createTelemetryServiceMock } from '../../common/lib/telemetry/telemetry_service.mock';

const customId = `My Convo`;

const mockedTelemetry = {
  ...createTelemetryServiceMock(),
};

vi.mock('../../context/typed_kibana_context/typed_kibana_context', async () => {
  const original = (await vi.importActual('../../context/typed_kibana_context/typed_kibana_context'));

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

vi.mock('@kbn/elastic-assistant', () => {
      const mocked = {
      getConversationById: vi.fn().mockReturnValue({
        id: customId,
        title: 'Custom',
        apiConfig: {},
        replacements: {},
        messages: [],
      }),
    };
      return { ...mocked, default: mocked };
    });

const trackingFns = [
  { name: 'reportAssistantInvoked', eventType: AssistantEventTypes.AssistantInvoked },
  { name: 'reportAssistantMessageSent', eventType: AssistantEventTypes.AssistantMessageSent },
  { name: 'reportAssistantQuickPrompt', eventType: AssistantEventTypes.AssistantQuickPrompt },
  { name: 'reportAssistantStarterPrompt', eventType: AssistantEventTypes.AssistantStarterPrompt },
];

describe('useAssistantTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should return the expected telemetry object with tracking functions', () => {
    const { result } = renderHook(() => useAssistantTelemetry());
    trackingFns.forEach((fn) => {
      expect(result.current).toHaveProperty(fn.name);
    });
  });

  describe.each(trackingFns)('Handles %s id masking', (fn) => {
    it('Should call tracking function', async () => {
      const { result } = renderHook(() => useAssistantTelemetry());
      // @ts-ignore
      const trackingFn = result.current[fn.name];
      await trackingFn({ invokedBy: 'shortcut' });
      // @ts-ignore
      const trackingMockedFn = mockedTelemetry.reportEvent;
      expect(trackingMockedFn).toHaveBeenCalledWith(fn.eventType, {
        invokedBy: 'shortcut',
      });
    });
  });
});
