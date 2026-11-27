/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { useHuntWithAiAvailability } from '../../home/use_hunt_with_ai_availability';
import {
  HuntAiAgentsButton,
  HUNT_AI_AGENTS_BUTTON_TEST_ID,
  HUNT_AI_AGENTS_PROMPT,
} from './hunt_ai_agents_button';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../home/use_hunt_with_ai_availability');

const openChat = jest.fn();

describe('HuntAiAgentsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { agentBuilder: { openChat } } });
  });

  it('opens a new chat with the AI agent posture prompt, not sent yet', () => {
    (useHuntWithAiAvailability as jest.Mock).mockReturnValue(true);
    render(<HuntAiAgentsButton />);
    fireEvent.click(screen.getByTestId(HUNT_AI_AGENTS_BUTTON_TEST_ID));
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: HUNT_AI_AGENTS_PROMPT,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
    expect(HUNT_AI_AGENTS_PROMPT).toContain('Unsanctioned AI agents');
  });

  it('is hidden where the home page Hunt with AI button is hidden', () => {
    (useHuntWithAiAvailability as jest.Mock).mockReturnValue(false);
    render(<HuntAiAgentsButton />);
    expect(screen.queryByTestId(HUNT_AI_AGENTS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
