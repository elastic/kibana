/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { PageAttachmentPersistedState } from '@kbn/page-attachment-schema';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { AddPageAttachmentToCaseModal } from './add_page_attachment_to_case_modal';
import * as usePageSummaryHook from '../../hooks/use_page_summary';

jest.mock('../../hooks/use_page_summary', () => ({
  usePageSummary: jest.fn(() => ({
    isObsAIAssistantEnabled: true,
    generateSummary: jest.fn(),
    isLoading: false,
    summary: '',
    errors: [],
    abortController: { signal: new AbortController().signal, abort: jest.fn() },
    screenContexts: [],
    isComplete: false,
  })),
}));

const mockCases: Partial<CasesPublicStart> = mockCasesContract();

describe('AddPageAttachmentToCaseModal', () => {
  const notifications = notificationServiceMock.createStartContract();
  const pageAttachmentState: PageAttachmentPersistedState = {
    type: 'example',
    url: {
      pathAndQuery: 'http://example.com',
      actionLabel: 'Go to Example Page',
      label: 'Example Page',
      iconType: 'globe',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCases.helpers = {
      canUseCases: jest.fn().mockReturnValue({
        read: true,
        update: true,
        push: true,
        all: true,
        create: true,
        delete: true,
        get: true,
        connectors: true,
        reopenCase: true,
        settings: true,
        createComment: true,
        getCaseUserActions: true,
        assign: true,
      }),
      getUICapabilities: jest.fn().mockReturnValue({}),
      getRuleIdFromEvent: jest.fn().mockReturnValue({}),
      groupAlertsByRule: jest.fn().mockReturnValue({}),
      getObservablesFromEcs: jest.fn().mockReturnValue({}),
    };
  });

  it('renders modal when user has permissions', () => {
    mockCases.helpers!.canUseCases = jest.fn().mockImplementationOnce(() => ({
      read: true,
      update: true,
      push: true,
    }));

    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={jest.fn()}
          notifications={notifications}
        />
      </IntlProvider>
    );

    expect(screen.getByText('Add page to case')).toBeInTheDocument();
  });

  it('does not render modal when user lacks permissions', () => {
    mockCases.helpers!.canUseCases = jest.fn().mockImplementationOnce(() => ({
      read: true,
      update: true,
      push: false,
    }));

    render(
      <AddPageAttachmentToCaseModal
        pageAttachmentState={pageAttachmentState}
        cases={mockCases as CasesPublicStart}
        onCloseModal={jest.fn()}
        notifications={notifications}
      />
    );

    expect(screen.queryByText('Add page to case')).not.toBeInTheDocument();
  });

  it('calls onCloseModal when cancel button is clicked', () => {
    const onCloseModalMock = jest.fn();

    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={onCloseModalMock}
          notifications={notifications}
        />
      </IntlProvider>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseModalMock).toHaveBeenCalled();
  });

  it('opens case modal when confirm button is clicked', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      errors: [],
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      isComplete: true,
    });

    const mockCasesModal = {
      open: jest.fn(),
      close: jest.fn(),
    };
    mockCases.hooks!.useCasesAddToExistingCaseModal = jest.fn(() => mockCasesModal);
    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={jest.fn()}
          notifications={notifications}
        />
      </IntlProvider>
    );

    fireEvent.click(screen.getByText('Confirm'));
    expect(mockCasesModal.open).toHaveBeenCalled();
  });

  it('passes correct getAttachments payload when case modal is opened', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      errors: [],
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      isComplete: true,
    });

    const mockCasesModal = {
      open: jest.fn(),
      close: jest.fn(),
    };
    mockCases.hooks!.useCasesAddToExistingCaseModal = jest.fn(() => mockCasesModal);
    const comment = 'Test comment';

    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={jest.fn()}
          notifications={notifications}
        />
      </IntlProvider>
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: comment } });
    fireEvent.click(screen.getByText('Confirm'));

    expect(mockCasesModal!.open).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });

    const attachments = mockCasesModal!.open.mock.calls[0][0].getAttachments();
    expect(attachments).toEqual([
      {
        persistableStateAttachmentState: {
          ...pageAttachmentState,
          screenContext: [],
          summary: comment,
        },
        persistableStateAttachmentTypeId: '.page',
        type: 'persistableState',
      },
    ]);
  });

  it('passes correct screenContexts to the case attachment', () => {
    const mockCasesModal = {
      open: jest.fn(),
      close: jest.fn(),
    };
    mockCases.hooks!.useCasesAddToExistingCaseModal = jest.fn(() => mockCasesModal);
    const screenContexts = [{ screenDescription: 'testContext' }];
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      errors: [],
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts,
      isComplete: true,
    });
    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={jest.fn()}
          notifications={notifications}
        />
      </IntlProvider>
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(mockCasesModal!.open).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });
    const attachments = mockCasesModal!.open.mock.calls[0][0].getAttachments();
    expect(attachments).toEqual([
      {
        persistableStateAttachmentState: {
          ...pageAttachmentState,
          screenContext: screenContexts,
          summary: '',
        },
        persistableStateAttachmentTypeId: '.page',
        type: 'persistableState',
      },
    ]);
  });

  it('can update the summary comment', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      errors: [],
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      isComplete: true,
    });

    const mockCasesModal = {
      open: jest.fn(),
      close: jest.fn(),
    };
    mockCases.hooks!.useCasesAddToExistingCaseModal = jest.fn(() => mockCasesModal);
    const comment = 'Test comment';
    render(
      <IntlProvider locale="en">
        <AddPageAttachmentToCaseModal
          pageAttachmentState={pageAttachmentState}
          cases={mockCases as CasesPublicStart}
          onCloseModal={jest.fn()}
          notifications={notifications}
        />
      </IntlProvider>
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: comment } });
    fireEvent.click(screen.getByText('Confirm'));
    expect(mockCasesModal!.open).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });
    const attachments = mockCasesModal!.open.mock.calls[0][0].getAttachments();
    expect(attachments).toEqual([
      {
        persistableStateAttachmentState: {
          ...pageAttachmentState,
          screenContext: [],
          summary: comment,
        },
        persistableStateAttachmentTypeId: '.page',
        type: 'persistableState',
      },
    ]);
  });

  it('should trigger a warning toast if hasCasesPermissions is false', () => {
    const addWarningMock = jest.spyOn(notifications.toasts, 'addWarning');
    mockCases.helpers!.canUseCases = jest.fn().mockImplementationOnce(() => ({
      read: true,
      update: true,
      push: false,
    }));

    render(
      <AddPageAttachmentToCaseModal
        pageAttachmentState={{} as any}
        cases={mockCases as any}
        notifications={notifications}
        onCloseModal={jest.fn()}
      />
    );

    expect(addWarningMock).toHaveBeenCalledWith({
      title: expect.stringContaining('Insufficient privileges to add page to case'),
    });
  });
});
