/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../common/mock';
import { NewAgentBuilderAttachment } from './new_agent_builder_attachment';
import * as i18n from './translations';
import { useAgentBuilderAvailability } from '../hooks/use_agent_builder_availability';
jest.mock('../hooks/use_agent_builder_availability');

describe('NewAgentBuilderAttachment', () => {
  const defaultProps = {
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('renders with default props', () => {
    render(
      <TestProviders>
        <NewAgentBuilderAttachment {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('newAgentBuilderAttachment')).toHaveTextContent(i18n.ADD_TO_CHAT);
  });

  it('renders with custom color', () => {
    render(
      <TestProviders>
        <NewAgentBuilderAttachment {...defaultProps} color="danger" />
      </TestProviders>
    );

    const button = screen.getByTestId('newAgentBuilderAttachment');
    expect(button).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(
      <TestProviders>
        <NewAgentBuilderAttachment {...defaultProps} size="xs" />
      </TestProviders>
    );

    const button = screen.getByTestId('newAgentBuilderAttachment');
    expect(button).toBeInTheDocument();
  });

  it('calls onClick callback when button is clicked', () => {
    const onClick = jest.fn();
    render(
      <TestProviders>
        <NewAgentBuilderAttachment onClick={onClick} />
      </TestProviders>
    );

    screen.getByTestId('newAgentBuilderAttachment').click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has correct data-test-subj attribute', () => {
    render(
      <TestProviders>
        <NewAgentBuilderAttachment {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('newAgentBuilderAttachment')).toBeInTheDocument();
  });

  it('renders disabled when license is invalid', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: false,
    });

    render(
      <TestProviders>
        <NewAgentBuilderAttachment {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('newAgentBuilderAttachment')).toBeDisabled();
  });
});
