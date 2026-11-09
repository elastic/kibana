/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders, kibanaMock } from '../../../common/mock';
import { EntityEventTypes } from '../../../common/lib/telemetry';
import type { StartServices } from '../../../types';
import { HUNT_LATEST_LEADS_PROMPT } from '../../prompts';
import { HuntWithAiButton, HUNT_WITH_AI_BUTTON_TEST_ID } from './hunt_with_ai_button';
import { useHuntWithAiAvailability } from './use_hunt_with_ai_availability';

jest.mock('./use_hunt_with_ai_availability', () => ({
  useHuntWithAiAvailability: jest.fn(),
}));

const mockUseHuntWithAiAvailability = useHuntWithAiAvailability as jest.Mock;

const renderButton = (startServices: Partial<StartServices> = {}) =>
  render(<HuntWithAiButton />, {
    wrapper: ({ children }) => (
      <TestProviders startServices={{ ...kibanaMock, ...startServices } as StartServices}>
        {children}
      </TestProviders>
    ),
  });

describe('HuntWithAiButton', () => {
  const openChat = jest.fn();
  const reportEvent = jest.fn();
  const services = {
    telemetry: { ...kibanaMock.telemetry, reportEvent },
    agentBuilder: { openChat },
  } as unknown as Partial<StartServices>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHuntWithAiAvailability.mockReturnValue(true);
  });

  it('renders when hunt with AI is available', () => {
    renderButton(services);

    expect(screen.getByTestId(HUNT_WITH_AI_BUTTON_TEST_ID)).toHaveTextContent('Hunt with AI');
  });

  it('renders nothing when hunt with AI is not available', () => {
    mockUseHuntWithAiAvailability.mockReturnValue(false);

    renderButton(services);

    expect(screen.queryByTestId(HUNT_WITH_AI_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('opens an unsent agent builder chat with the latest leads prompt', () => {
    renderButton(services);

    fireEvent.click(screen.getByTestId(HUNT_WITH_AI_BUTTON_TEST_ID));

    expect(openChat).toHaveBeenCalledTimes(1);
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: HUNT_LATEST_LEADS_PROMPT,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  });

  it('reports the hunt with AI telemetry event on click', () => {
    renderButton(services);

    fireEvent.click(screen.getByTestId(HUNT_WITH_AI_BUTTON_TEST_ID));

    expect(reportEvent).toHaveBeenCalledWith(EntityEventTypes.LeadGenerationHuntWithAiClicked, {});
  });
});
