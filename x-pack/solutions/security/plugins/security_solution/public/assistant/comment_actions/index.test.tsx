/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { CommentActions } from '.';
import { updateAndAssociateNode } from '../../timelines/components/notes/helpers';
import { useKibana } from '../../common/lib/kibana';
import { useAssistantAvailability } from '../use_assistant_availability';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../use_assistant_availability');
jest.mock('../../timelines/components/notes/helpers', () => ({
  ...jest.requireActual('../../timelines/components/notes/helpers'),
  updateAndAssociateNode: jest.fn(),
}));

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      cases: {
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
            open: jest.fn(),
          }),
        },
      },
    },
  }),
}));

const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = createMockStore(mockGlobalState);

  return <TestProviders store={store}>{children}</TestProviders>;
};

describe('CommentActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasSearchAILakeConfigurations: false,
    });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
  });
  it('content added to timeline is correct', () => {
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { container } = render(<CommentActions message={message} />, { wrapper: Wrapper });

    fireEvent.click(
      container.querySelector('[aria-label="Add message content as a timeline note"]')!
    );

    expect(updateAndAssociateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        newNote: 'Only this should be copied!',
      })
    );
  });

  it('content added to case is correct', () => {
    const mockAddToExistingCaseModal = jest.fn();
    (useKibana as unknown as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
              open: mockAddToExistingCaseModal,
            }),
          },
        },
      },
    });
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { container } = render(<CommentActions message={message} />, { wrapper: Wrapper });

    fireEvent.click(container.querySelector('[aria-label="Add to existing case"]')!);

    expect(mockAddToExistingCaseModal).toHaveBeenCalledTimes(1);
    const args = mockAddToExistingCaseModal.mock.calls[0][0];

    const attachments = args.getAttachments();
    expect(attachments).toHaveLength(1);
    expect(attachments[0].comment).toBe('Only this should be copied!');
  });
  it('renders all actions when traceData and not EASE', () => {
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
      traceData: { traceId: '123' },
    };
    const { getByTestId } = render(<CommentActions message={message} />, { wrapper: Wrapper });

    expect(getByTestId('apmTraceButton')).toBeInTheDocument();
    expect(getByTestId('addMessageContentAsTimelineNote')).toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
  it('renders only case and timeline actions when no traceData and not EASE', () => {
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { getByTestId, queryByTestId } = render(<CommentActions message={message} />, {
      wrapper: Wrapper,
    });

    expect(queryByTestId('apmTraceButton')).not.toBeInTheDocument();
    expect(getByTestId('addMessageContentAsTimelineNote')).toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
  it('renders only case action when traceData and EASE', () => {
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasSearchAILakeConfigurations: true,
    });
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
      traceData: { traceId: '123' },
    };
    const { getByTestId, queryByTestId } = render(<CommentActions message={message} />, {
      wrapper: Wrapper,
    });

    expect(queryByTestId('apmTraceButton')).not.toBeInTheDocument();
    expect(queryByTestId('addMessageContentAsTimelineNote')).not.toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
});
