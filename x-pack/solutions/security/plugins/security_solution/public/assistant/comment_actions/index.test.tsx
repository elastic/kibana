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
});
