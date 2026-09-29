/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';

import { useAddToCase } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';

vi.mock('../../../../../common/lib/kibana', () => {
  const mocked = {
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

describe('useAddToCase', () => {
  const mockCanUserCreateAndReadCases = vi.fn();
  const mockTitle = 'Attack discovery title';
  const mockAlertIds = ['alert1', 'alert2'];
  const mockMarkdownComments = ['Comment 1', 'Comment 2'];
  const mockReplacements = { alert1: 'replacement1', alert2: 'replacement2' };

  beforeEach(() => {
    vi.clearAllMocks();
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
    const mockOpenSelectCaseModal = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({
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

  it.each([true, false])('forwards the case path on success when isNewCase is %s', (isNewCase) => {
    const onSuccess = vi.fn();
    const useCasesAddToExistingCaseModal = vi.fn().mockReturnValue({
      open: vi.fn(),
    });
    (useKibana as Mock).mockReturnValue({
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
    onCaseSelectorSuccess({}, isNewCase);

    expect(onSuccess).toHaveBeenCalledWith(isNewCase);
  });

  it('preserves the create-case prefill in the selector modal', () => {
    const useCasesAddToExistingCaseModal = vi.fn().mockReturnValue({
      open: vi.fn(),
    });
    (useKibana as Mock).mockReturnValue({
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
