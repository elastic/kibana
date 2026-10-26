/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { act, renderHook } from '@testing-library/react';

import { useAddToCase } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana', () => ({
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

describe('useAddToCase', () => {
  const mockCanUserCreateAndReadCases = jest.fn();
  const mockTitle = 'Attack discovery title';
  const mockAlertIds = ['alert1', 'alert2'];
  const mockMarkdownComments = ['Comment 1', 'Comment 2'];
  const mockReplacements = { alert1: 'replacement1', alert2: 'replacement2' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { canUseCases: false, disabled: true },
    { canUseCases: true, disabled: false },
  ])('sets disabled to $disabled when case access is $canUseCases', ({ canUseCases, disabled }) => {
    mockCanUserCreateAndReadCases.mockReturnValue(canUseCases);

    const { result } = renderHook(
      () =>
        useAddToCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          title: mockTitle,
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.disabled).toBe(disabled);
  });

  it('opens the case selector with the expected attachments', () => {
    mockCanUserCreateAndReadCases.mockReturnValue(true);
    const mockOpenSelectCaseModal = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
              open: mockOpenSelectCaseModal,
            }),
          },
        },
      },
    });

    const { result } = renderHook(
      () =>
        useAddToCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          title: mockTitle,
        }),
      { wrapper: TestProviders }
    );

    act(() => {
      result.current.onAddToCase({
        alertIds: mockAlertIds,
        markdownComments: mockMarkdownComments,
        replacements: mockReplacements,
      });
    });

    const { getAttachments } = mockOpenSelectCaseModal.mock.calls[0][0];
    expect(getAttachments()).toEqual([
      { data: { content: 'Comment 1' }, type: 'comment' },
      { data: { content: 'Comment 2' }, type: 'comment' },
      {
        attachmentId: 'replacement1',
        metadata: {
          index: '',
          rule: { id: null, name: null },
        },
        type: 'security.alert',
      },
      {
        attachmentId: 'replacement2',
        metadata: {
          index: '',
          rule: { id: null, name: null },
        },
        type: 'security.alert',
      },
    ]);
  });

  it('opens the case selector with the attachments the caller builds for the chosen case', () => {
    mockCanUserCreateAndReadCases.mockReturnValue(true);
    const mockOpenSelectCaseModal = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
              open: mockOpenSelectCaseModal,
            }),
          },
        },
      },
    });
    const attachments = [
      {
        type: SECURITY_ATTACK_ATTACHMENT_TYPE,
        attachmentId: 'attack-1',
        metadata: { title: 'An attack', alertCount: 1, index: 'attack-index' },
      },
    ];

    const { result } = renderHook(
      () =>
        useAddToCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          title: mockTitle,
        }),
      { wrapper: TestProviders }
    );

    const buildAttachments = jest.fn().mockReturnValue(attachments);

    act(() => {
      result.current.onAddToCase({ getAttachments: buildAttachments });
    });

    const { getAttachments } = mockOpenSelectCaseModal.mock.calls[0][0];
    const theCase = { id: 'case-1', totalAlerts: 12 } as unknown as CaseUI;

    expect(getAttachments({ theCase })).toEqual(attachments);
    // The chosen case is handed to the caller so it can size the payload against it.
    expect(buildAttachments).toHaveBeenCalledWith(theCase);
  });

  it.each([true, false])('forwards the case on success when isNewCase is %s', (isNewCase) => {
    const onSuccess = jest.fn();
    const useCasesAddToExistingCaseModal = jest.fn().mockReturnValue({
      open: jest.fn(),
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal,
          },
        },
      },
    });

    renderHook(
      () =>
        useAddToCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          onSuccess,
          title: mockTitle,
        }),
      { wrapper: TestProviders }
    );

    const { onSuccess: onCaseSelectorSuccess } = useCasesAddToExistingCaseModal.mock.calls[0][0];
    const theCase = { id: 'case-1', totalAlerts: 12 } as unknown as CaseUI;
    onCaseSelectorSuccess(theCase, isNewCase);

    // The case is what the caller needs to report on the attach that just landed.
    expect(onSuccess).toHaveBeenCalledWith(theCase, isNewCase);
  });

  it('preserves the create-case prefill in the selector modal', () => {
    const useCasesAddToExistingCaseModal = jest.fn().mockReturnValue({
      open: jest.fn(),
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal,
          },
        },
      },
    });

    renderHook(
      () =>
        useAddToCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          title: mockTitle,
        }),
      { wrapper: TestProviders }
    );

    expect(useCasesAddToExistingCaseModal).toHaveBeenCalledWith(
      expect.objectContaining({
        createCaseFlyout: {
          headerContent: expect.anything(),
          initialValue: {
            description: `This case was opened for attack discovery: _${mockTitle}_`,
            title: mockTitle,
          },
        },
        successToaster: {
          content: 'Successfully added attack discovery to the case',
        },
      })
    );
  });
});
