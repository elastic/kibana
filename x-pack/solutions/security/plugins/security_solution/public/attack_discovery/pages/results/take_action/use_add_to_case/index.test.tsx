/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      { comment: 'Comment 1', type: 'user' },
      { comment: 'Comment 2', type: 'user' },
      {
        alertId: 'replacement1',
        index: '',
        rule: { id: null, name: null },
        type: 'alert',
      },
      {
        alertId: 'replacement2',
        index: '',
        rule: { id: null, name: null },
        type: 'alert',
      },
    ]);
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
