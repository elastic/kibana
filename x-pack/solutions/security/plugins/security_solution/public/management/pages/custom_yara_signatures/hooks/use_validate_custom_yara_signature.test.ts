/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../common/endpoint/constants';
import { MAX_YARA_RULE_CONTENT_BYTE_LENGTH } from '../../../../../common/endpoint/service/artifacts/constants';
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

  describe('content size', () => {
    const euroSign = '€'; // takes up 3 bytes in UTF-8

    it('should return a size error without calling the API if the rule exceeds the byte limit', () => {
      const mockedContext = createAppRootMockRenderer();

      const { result } = mockedContext.renderHook(() =>
        useValidateCustomYaraSignature({
          yaraRule: 'a'.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH + 1),
          osTypes: [OperatingSystem.WINDOWS],
        })
      );

      expect(result.current.errors).toEqual([
        {
          message: 'Definition must not exceed 32,766 bytes (currently 32,767 bytes)',
          line: 0,
          severity: 'error',
        },
      ]);
      expect(result.current.isYaraSyntaxValid).toBe(false);
      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalled();
    });

    it('should call the API if multi-byte content is exactly at the byte limit', async () => {
      const mockedContext = createAppRootMockRenderer();
      mockedContext.coreStart.http.post.mockResolvedValue({
        errors: [],
        warnings: [],
        error_count: 0,
        warning_count: 0,
      });
      const yaraRule = euroSign.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH / 3);

      const { result } = mockedContext.renderHook(() =>
        useValidateCustomYaraSignature({
          yaraRule,
          osTypes: [OperatingSystem.WINDOWS],
        })
      );

      await waitFor(() => {
        expect(result.current.isYaraSyntaxValid).toBe(true);
      });
      expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);
    });

    it('should count bytes instead of characters for multi-byte content', () => {
      const mockedContext = createAppRootMockRenderer();
      const yaraRule = `${euroSign.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH / 3)}a`;

      const { result } = mockedContext.renderHook(() =>
        useValidateCustomYaraSignature({
          yaraRule,
          osTypes: [OperatingSystem.WINDOWS],
        })
      );

      expect(result.current.errors).toEqual([
        expect.objectContaining({
          message: 'Definition must not exceed 32,766 bytes (currently 32,767 bytes)',
        }),
      ]);
      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalled();
    });
  });
});
