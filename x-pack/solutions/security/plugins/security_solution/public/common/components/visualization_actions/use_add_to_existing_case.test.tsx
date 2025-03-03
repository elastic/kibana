/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useAddToExistingCase } from './use_add_to_existing_case';
import {
  allCasesPermissions,
  readCasesPermissions,
  writeCasesPermissions,
} from '../../../cases_test_utils';
import { AttachmentType } from '@kbn/cases-plugin/common';

jest.mock('../../lib/kibana');

describe('useAddToExistingCase', () => {
  const mockedUseKibana = mockUseKibana();
  const mockCanUseCases = jest.fn();
  const mockUseCasesAddToExistingCaseModal = jest.fn().mockReturnValue({
    open: jest.fn(),
    close: jest.fn(),
  });
  const mockOnAddToCaseClicked = jest.fn();
  const timeRange = {
    from: '2022-03-06T16:00:00.000Z',
    to: '2022-03-07T15:59:59.999Z',
  };

  beforeEach(() => {
    mockCanUseCases.mockReturnValue(allCasesPermissions());
    mockedUseKibana.services.cases.hooks.useCasesAddToExistingCaseModal =
      mockUseCasesAddToExistingCaseModal;
    mockedUseKibana.services.cases.helpers.canUseCases = mockCanUseCases;
  });

  it('useCasesAddToExistingCaseModal with attachments', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
        lensMetadata: undefined,
      })
    );
    expect(mockUseCasesAddToExistingCaseModal).toHaveBeenCalledWith({
      onClose: mockOnAddToCaseClicked,
      successToaster: {
        title: 'Successfully added visualization to the case',
      },
    });
    expect(result.current.disabled).toEqual(false);
  });

  it("disables the button if the user can't create but can read", () => {
    mockCanUseCases.mockReturnValue(readCasesPermissions());

    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
        lensMetadata: undefined,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it("disables the button if the user can't read but can create", () => {
    mockCanUseCases.mockReturnValue(writeCasesPermissions());

    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
        lensMetadata: undefined,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no lensAttributes', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: null,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
        lensMetadata: undefined,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no timeRange', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange: null,
        onAddToCaseClicked: mockOnAddToCaseClicked,
        lensMetadata: undefined,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('should open add to existing case modal', () => {
    const mockOpenCaseModal = jest.fn();
    const mockClick = jest.fn();
    const lensMetadata = {
      description: 'test_description',
    };

    mockUseCasesAddToExistingCaseModal.mockReturnValue({ open: mockOpenCaseModal });

    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockClick,
        lensMetadata,
      })
    );

    result.current.onAddToExistingCaseClicked();
    const attachments = mockOpenCaseModal.mock.calls[0][0].getAttachments();

    expect(attachments).toEqual([
      {
        persistableStateAttachmentState: {
          attributes: kpiHostMetricLensAttributes,
          timeRange,
          metadata: lensMetadata,
        },
        persistableStateAttachmentTypeId: '.lens',
        type: AttachmentType.persistableState as const,
      },
    ]);
    expect(mockClick).toHaveBeenCalled();
  });
});
