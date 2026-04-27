/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ViewInAiAssistant } from '.';
import { TestProviders } from '../../../../../common/mock';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';
import { VIEW_IN_AI_ASSISTANT } from './translations';
import * as useViewInAiAssistantModule from './use_view_in_ai_assistant';

describe('ViewInAiAssistant', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not invoke useViewInAiAssistant when the overlay is provided by the parent', () => {
    const spy = jest.spyOn(useViewInAiAssistantModule, 'useViewInAiAssistant');

    render(
      <TestProviders>
        <ViewInAiAssistant
          attackDiscovery={mockAttackDiscovery}
          viewInAiAssistantOverlay={{
            disabled: false,
            promptContextId: 'parent-provided',
            showAssistantOverlay: jest.fn(),
          }}
        />
      </TestProviders>
    );

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId('viewInAiAssistant')).toBeInTheDocument();
  });
  it('renders the assistant avatar', () => {
    render(
      <TestProviders>
        <ViewInAiAssistant attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const assistantAvatar = screen.getByTestId('assistantAvatar');

    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders the expected button label', () => {
    render(
      <TestProviders>
        <ViewInAiAssistant attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const viewInAiAssistantLabel = screen.getByTestId('viewInAiAssistantLabel');

    expect(viewInAiAssistantLabel).toHaveTextContent(VIEW_IN_AI_ASSISTANT);
  });

  describe('compact mode', () => {
    it('does NOT render the assistant avatar', () => {
      render(
        <TestProviders>
          <ViewInAiAssistant attackDiscovery={mockAttackDiscovery} compact={true} />
        </TestProviders>
      );

      const assistantAvatar = screen.queryByTestId('assistantAvatar');

      expect(assistantAvatar).not.toBeInTheDocument();
    });

    it('renders the expected button text', () => {
      render(
        <TestProviders>
          <ViewInAiAssistant attackDiscovery={mockAttackDiscovery} compact={true} />
        </TestProviders>
      );

      const viewInAiAssistantCompact = screen.getByTestId('viewInAiAssistantCompact');

      expect(viewInAiAssistantCompact).toHaveTextContent(VIEW_IN_AI_ASSISTANT);
    });
  });
});
