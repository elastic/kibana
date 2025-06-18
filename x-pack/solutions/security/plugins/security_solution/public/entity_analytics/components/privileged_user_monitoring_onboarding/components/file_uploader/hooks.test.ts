/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTelemetryServiceMock } from '../../../../../common/lib/telemetry/telemetry_service.mock';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { waitFor, renderHook } from '@testing-library/react';
import { useFileValidation } from './hooks';
import { useKibana as mockUseKibana } from '../../../../../common/lib/kibana/__mocks__';
import { mockGlobalState } from '../../../../../common/mock';

const mockedExperimentalFeatures = mockGlobalState.app.enableExperimental;
const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();

jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useEnableExperimental: () => ({ ...mockedExperimentalFeatures }),
}));

jest.mock('../../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../../common/lib/kibana');

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
  const validLine = 'user1';
  const invalidLine = 'user1,extra_field';

  test('should call onError when an error occurs', () => {
    const onErrorMock = jest.fn();
    const onCompleteMock = jest.fn();
    const invalidFileType = 'invalid file type';

    const { result } = renderHook(
      () => useFileValidation({ onError: onErrorMock, onComplete: onCompleteMock }),
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
      () => useFileValidation({ onError: onErrorMock, onComplete: onCompleteMock }),
      { wrapper: TestProviders }
    );
    result.current(new File([`${validLine}\n${invalidLine}`], fileName, { type: 'text/csv' }));

    await waitFor(() => {
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedFile: {
            name: fileName,
            size: 23,
            validLines: {
              text: validLine,
              count: 1,
            },
            invalidLines: {
              text: invalidLine,
              count: 1,
              errors: [
                {
                  message: 'Expected 1 column, got 2',
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
