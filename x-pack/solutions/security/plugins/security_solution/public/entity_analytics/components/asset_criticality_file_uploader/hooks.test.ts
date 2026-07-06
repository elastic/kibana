/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { renderHook, waitFor } from '@testing-library/react';
import { useFileValidation, useNavigationSteps } from './hooks';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { FileUploaderSteps } from './types';

const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('useFileValidation', () => {
  const validLine = 'user,user-001,low_impact';
  const invalidLine = 'user,user-001,low_impact,extra_field';

  describe('when isEntityStoreV2Enabled is false', () => {
    test('should call onError when an error occurs', () => {
      const onErrorMock = jest.fn();
      const onCompleteMock = jest.fn();
      const invalidFileType = 'invalid file type';

      const { result } = renderHook(
        () =>
          useFileValidation({
            isEntityStoreV2Enabled: false,
            onError: onErrorMock,
            onComplete: onCompleteMock,
          }),
        { wrapper: TestProviders }
      );
      result.current(new File([invalidLine], 'test.csv', { type: invalidFileType }));

      expect(onErrorMock).toHaveBeenCalled();
      expect(onCompleteMock).not.toHaveBeenCalled();
    });

    test('should call onComplete when file validation is complete', async () => {
      const onErrorMock = jest.fn();
      const onCompleteMock = jest.fn();
      const fileName = 'test.csv';

      const { result } = renderHook(
        () =>
          useFileValidation({
            isEntityStoreV2Enabled: false,
            onError: onErrorMock,
            onComplete: onCompleteMock,
          }),
        { wrapper: TestProviders }
      );
      result.current(new File([`${validLine}\n${invalidLine}`], fileName, { type: 'text/csv' }));

      await waitFor(() => {
        expect(onErrorMock).not.toHaveBeenCalled();
        expect(onCompleteMock).toHaveBeenCalledWith(
          expect.objectContaining({
            validatedFile: {
              name: fileName,
              size: 61,
              validLines: {
                text: validLine,
                count: 1,
              },
              invalidLines: {
                text: invalidLine,
                count: 1,
                errors: [
                  {
                    message: 'Expected 3 columns, got 4',
                    index: 1,
                  },
                ],
              },
            },
            processingEndTime: expect.any(String),
            processingStartTime: expect.any(String),
            tookMs: expect.any(Number),
          })
        );
      });
    });
  });

  describe('when isEntityStoreV2Enabled is true', () => {
    const headerRow = 'type,user.email,user.name,criticality_level';

    test('should call onError for invalid file type', () => {
      const onErrorMock = jest.fn();
      const onCompleteMock = jest.fn();

      const { result } = renderHook(
        () =>
          useFileValidation({
            isEntityStoreV2Enabled: true,
            onError: onErrorMock,
            onComplete: onCompleteMock,
          }),
        { wrapper: TestProviders }
      );
      result.current(new File([invalidLine], 'test.csv', { type: 'invalid file type' }));

      expect(onErrorMock).toHaveBeenCalled();
      expect(onCompleteMock).not.toHaveBeenCalled();
    });

    test('should call onComplete with all rows valid and no invalid lines', async () => {
      const onErrorMock = jest.fn();
      const onCompleteMock = jest.fn();
      const fileName = 'test.csv';
      // V2 rows that would be "invalid" in V1 are accepted as-is
      const csvContent = `${headerRow}\n${validLine}\n${invalidLine}`;

      const { result } = renderHook(
        () =>
          useFileValidation({
            isEntityStoreV2Enabled: true,
            onError: onErrorMock,
            onComplete: onCompleteMock,
          }),
        { wrapper: TestProviders }
      );
      result.current(new File([csvContent], fileName, { type: 'text/csv' }));

      await waitFor(() => {
        expect(onErrorMock).not.toHaveBeenCalled();
        expect(onCompleteMock).toHaveBeenCalledWith(
          expect.objectContaining({
            validatedFile: expect.objectContaining({
              name: fileName,
              invalidLines: {
                text: '',
                count: 0,
                errors: [],
              },
            }),
          })
        );
      });
    });

    test('should subtract 1 from count to exclude the header row', async () => {
      const onCompleteMock = jest.fn();
      const fileName = 'test.csv';
      const csvContent = `${headerRow}\n${validLine}\n${validLine}`;

      const { result } = renderHook(
        () =>
          useFileValidation({
            isEntityStoreV2Enabled: true,
            onError: jest.fn(),
            onComplete: onCompleteMock,
          }),
        { wrapper: TestProviders }
      );
      result.current(new File([csvContent], fileName, { type: 'text/csv' }));

      await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalledWith(
          expect.objectContaining({
            validatedFile: expect.objectContaining({
              validLines: expect.objectContaining({
                count: 2, // 3 total rows - 1 header row
              }),
            }),
          })
        );
      });
    });
  });
});

describe('useNavigationSteps', () => {
  const goToFirstStep = jest.fn();
  const filePickerState = { step: FileUploaderSteps.FILE_PICKER as const, isLoading: false };
  const resultState = { step: FileUploaderSteps.RESULT as const, validLinesAsText: '' };

  test('includes validation step when isEntityStoreV2Enabled is false', () => {
    const { result } = renderHook(() => useNavigationSteps(filePickerState, false, goToFirstStep));

    expect(result.current).toHaveLength(3);
    expect(result.current[1].title).toMatch(/file validation/i);
  });

  test('excludes validation step when isEntityStoreV2Enabled is true', () => {
    const { result } = renderHook(() => useNavigationSteps(filePickerState, true, goToFirstStep));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].title).toMatch(/select a file/i);
    expect(result.current[1].title).toMatch(/results/i);
  });

  test('result step is always last', () => {
    const { result } = renderHook(() => useNavigationSteps(resultState, true, goToFirstStep));

    expect(result.current[result.current.length - 1].title).toMatch(/results/i);
  });
});
