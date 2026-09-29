/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyPrompt } from '.';
import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import { useHasWorkflowsPrivileges } from '../../../hooks/use_has_workflows_privileges';
import { TestProviders } from '../../../../../common/mock';

vi.mock('../../../../../assistant/use_assistant_availability');
vi.mock('../../../hooks/use_has_workflows_privileges');

const mockUseHasWorkflowsPrivileges = useHasWorkflowsPrivileges as Mock;

describe('EmptyPrompt', () => {
  const aiConnectorsCount = 2;
  const attackDiscoveriesCount = 0;
  const onGenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHasWorkflowsPrivileges.mockReturnValue({
      hasWorkflowsExecute: true,
      hasWorkflowsRead: true,
      missingPrivileges: { featurePrivileges: [], indexPrivileges: [] },
    });
  });

  describe('when the user has the assistant privilege', () => {
    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={aiConnectorsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            isLoading={false}
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('renders the empty prompt avatar', () => {
      const emptyPromptAvatar = screen.getByTestId('emptyPromptAvatar');

      expect(emptyPromptAvatar).toBeInTheDocument();
    });

    it('calls onGenerate when the generate button is clicked', () => {
      const generateButton = screen.getByTestId('generate');

      fireEvent.click(generateButton);

      expect(onGenerate).toHaveBeenCalled();
    });
  });

  describe('when loading is true', () => {
    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={2} // <-- non-null
            attackDiscoveriesCount={0} // <-- no discoveries
            isLoading={true} // <-- loading
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('returns null', () => {
      const emptyPrompt = screen.queryByTestId('emptyPrompt');

      expect(emptyPrompt).not.toBeInTheDocument();
    });
  });

  describe('when aiConnectorsCount is null', () => {
    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={null} // <--  null
            attackDiscoveriesCount={0} // <-- no discoveries
            isLoading={false} // <-- not loading
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('returns null', () => {
      const emptyPrompt = screen.queryByTestId('emptyPrompt');

      expect(emptyPrompt).not.toBeInTheDocument();
    });
  });

  describe('when there are attack discoveries', () => {
    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={2} // <-- non-null
            attackDiscoveriesCount={7} // there are discoveries
            isLoading={false} // <-- not loading
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('returns null', () => {
      const emptyPrompt = screen.queryByTestId('emptyPrompt');

      expect(emptyPrompt).not.toBeInTheDocument();
    });
  });

  describe('when isDisabled is true', () => {
    const isDisabled = true;

    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={2} // <-- non-null
            attackDiscoveriesCount={0} // <-- no discoveries
            isLoading={false}
            isDisabled={isDisabled}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('disables the generate button when isDisabled is true', () => {
      const generateButton = screen.getByTestId('generate');

      expect(generateButton).toBeDisabled();
    });
  });

  describe('when the user lacks the workflows execute privilege', () => {
    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });
      mockUseHasWorkflowsPrivileges.mockReturnValue({
        hasWorkflowsExecute: false,
        hasWorkflowsRead: false,
        missingPrivileges: {
          featurePrivileges: [['workflowsManagement', ['read', 'execute']]],
          indexPrivileges: [],
        },
      });

      render(
        <TestProviders>
          <EmptyPrompt
            aiConnectorsCount={aiConnectorsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            isLoading={false}
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('disables the generate button', () => {
      expect(screen.getByTestId('generate')).toBeDisabled();
    });

    it('does not call onGenerate when the generate button is clicked', () => {
      fireEvent.click(screen.getByTestId('generate'));

      expect(onGenerate).not.toHaveBeenCalled();
    });
  });

  describe('rendering', () => {
    const defaultProps = {
      alertsCount: 20,
      aiConnectorsCount: 2,
      attackDiscoveriesCount: 0,
      isLoading: false,
      isDisabled: false,
      onGenerate: vi.fn(),
    };

    beforeEach(() => {
      (useAssistantAvailability as Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });
      vi.clearAllMocks();
      render(
        <TestProviders>
          <EmptyPrompt {...defaultProps} />
        </TestProviders>
      );
    });

    it('renders the history title', () => {
      const historyTitle = screen.getByTestId('historyTitle');

      expect(historyTitle).toBeInTheDocument();
    });

    it('renders the history body', () => {
      const historyBody = screen.getByTestId('historyBody');

      expect(historyBody).toBeInTheDocument();
    });
  });
});
