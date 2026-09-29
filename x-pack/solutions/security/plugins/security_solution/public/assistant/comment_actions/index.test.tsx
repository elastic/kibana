/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { CommentActions } from '.';
import { updateAndAssociateNode } from '../../timelines/components/notes/helpers';
import { useKibana } from '../../common/lib/kibana';
import { useAssistantAvailability } from '../use_assistant_availability';

vi.mock('../use_assistant_availability');
vi.mock('../../timelines/components/notes/helpers', async () => {
      const mocked = {
      ...(await vi.importActual('../../timelines/components/notes/helpers')),
      updateAndAssociateNode: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/lib/kibana', async () => {
      const mocked = {
      ...(await vi.importActual('../../common/lib/kibana')),
      useKibana: vi.fn().mockReturnValue({
        services: {
          cases: {
            hooks: {
              useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({
                open: vi.fn(),
              }),
            },
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = createMockStore(mockGlobalState);

  return <TestProviders store={store}>{children}</TestProviders>;
};

describe('CommentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssistantAvailability as Mock).mockReturnValue({
      hasSearchAILakeConfigurations: false,
    });
  });
  it('content added to timeline is correct', () => {
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { container } = render(<CommentActions message={message} />, { wrapper: Wrapper });

    fireEvent.click(
      container.querySelector('[aria-label="Add message content as a Timeline note"]')!
    );

    expect(updateAndAssociateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        newNote: 'Only this should be copied!',
      })
    );
  });

  it('content added to case is correct', () => {
    const mockAddToExistingCaseModal = vi.fn();
    (useKibana as unknown as Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({
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
    expect(attachments[0].data.content).toBe('Only this should be copied!');
  });
  it('renders timeline and case actions when not EASE', () => {
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { getByTestId } = render(<CommentActions message={message} />, {
      wrapper: Wrapper,
    });

    expect(getByTestId('addMessageContentAsTimelineNote')).toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
  it('renders only case action when EASE', () => {
    (useAssistantAvailability as Mock).mockReturnValue({
      hasSearchAILakeConfigurations: true,
    });
    const message: ClientMessage = {
      content: `Only this should be copied! {reference(exampleReferenceId)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    const { getByTestId, queryByTestId } = render(<CommentActions message={message} />, {
      wrapper: Wrapper,
    });

    expect(queryByTestId('addMessageContentAsTimelineNote')).not.toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
  it('does not render APM trace button even when traceData is present', () => {
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
    expect(getByTestId('addMessageContentAsTimelineNote')).toBeInTheDocument();
    expect(getByTestId('addToExistingCaseButton')).toBeInTheDocument();
  });
});
