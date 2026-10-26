/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../common/endpoint/constants';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import {
  VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS,
  useValidateCustomYaraSignature,
  type UseValidateCustomYaraSignatureProps,
} from './use_validate_custom_yara_signature';

const RULE_A = 'rule A { condition: true }';
const RULE_B = 'rule B { condition: true }';

describe('useValidateCustomYaraSignature', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should POST the validate route with a versioned JSON body', async () => {
    const mockedContext = createAppRootMockRenderer();
    mockedContext.coreStart.http.post.mockResolvedValue({
      errors: [],
      warnings: [],
      error_count: 0,
      warning_count: 0,
    });

    mockedContext.renderHook(() =>
      useValidateCustomYaraSignature({
        yaraRule: RULE_A,
        osTypes: [OperatingSystem.WINDOWS],
      })
    );

    await waitFor(() => {
      expect(mockedContext.coreStart.http.post).toHaveBeenCalledWith(
        CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
        expect.objectContaining({
          version: '1',
          body: JSON.stringify({
            yara_rule: RULE_A,
            os_types: [OperatingSystem.WINDOWS],
          }),
        })
      );
    });
  });

  it('should hide diagnostics while dirty and restore them from cache on revert', async () => {
    const mockedContext = createAppRootMockRenderer();
    mockedContext.coreStart.http.post.mockResolvedValue({
      errors: [{ message: 'syntax error', line: 1, severity: 'error' }],
      warnings: [],
      error_count: 1,
      warning_count: 0,
    });

    const { rerender, result, unmount } = mockedContext.renderHook(
      (props: UseValidateCustomYaraSignatureProps) => useValidateCustomYaraSignature(props),
      {
        initialProps: {
          yaraRule: RULE_A,
          osTypes: [OperatingSystem.WINDOWS],
        },
      }
    );

    await waitFor(() => {
      expect(result.current.errors).toEqual([
        { message: 'syntax error', line: 1, severity: 'error' },
      ]);
    });
    expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);

    rerender({
      yaraRule: RULE_B,
      osTypes: [OperatingSystem.WINDOWS],
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.errors).toEqual([]);
    expect(result.current.isYaraSyntaxValid).toBe(false);

    rerender({
      yaraRule: RULE_A,
      osTypes: [OperatingSystem.WINDOWS],
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toEqual([
      { message: 'syntax error', line: 1, severity: 'error' },
    ]);
    expect(result.current.isYaraSyntaxValid).toBe(false);
    expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('should not refetch when the debounced input is unchanged', async () => {
    const mockedContext = createAppRootMockRenderer();
    mockedContext.coreStart.http.post.mockResolvedValue({
      errors: [],
      warnings: [],
      error_count: 0,
      warning_count: 0,
    });

    const { rerender, result, unmount } = mockedContext.renderHook(
      (props: UseValidateCustomYaraSignatureProps) => useValidateCustomYaraSignature(props),
      {
        initialProps: {
          yaraRule: RULE_A,
          osTypes: [OperatingSystem.WINDOWS],
        },
      }
    );

    await waitFor(() => {
      expect(result.current.isYaraSyntaxValid).toBe(true);
    });

    rerender({
      yaraRule: RULE_B,
      osTypes: [OperatingSystem.WINDOWS],
    });
    rerender({
      yaraRule: RULE_A,
      osTypes: [OperatingSystem.WINDOWS],
    });

    act(() => {
      jest.advanceTimersByTime(VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(result.current.isYaraSyntaxValid).toBe(true);
    });
    expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);

    unmount();
  });
});
