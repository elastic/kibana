/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';

import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../../../common/constants';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import type {
  UseShowRelatedAttacksParams,
  UseShowRelatedAttacksResult,
} from './use_show_related_attacks';
import { useShowRelatedAttacks } from './use_show_related_attacks';

const mockedUseKibana = mockUseKibana();
const mockUiSettingsGet = jest.fn();

jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        uiSettings: {
          ...mockedUseKibana.services.uiSettings,
          get: mockUiSettingsGet,
        },
      },
    }),
  };
});

describe('useShowRelatedAttacks', () => {
  let hookResult: RenderHookResult<UseShowRelatedAttacksResult, UseShowRelatedAttacksParams>;

  beforeEach(() => {
    mockUiSettingsGet.mockImplementation((key: string, fallbackValue: boolean) => {
      if (key === ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING) {
        return true;
      }

      return fallbackValue;
    });
  });

  it('should return false if getFieldsData returns null and setting is enabled', () => {
    const getFieldsData = () => null;
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: false, attackIds: [] });
  });

  it('should return false if setting is disabled, even when attack ids exist', () => {
    mockUiSettingsGet.mockImplementation((key: string, fallbackValue: boolean) => {
      if (key === ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING) {
        return false;
      }

      return fallbackValue;
    });

    const getFieldsData = () => ['attack-id-1', 'attack-id-2'];
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({
      show: false,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return true if setting is enabled and getFieldsData has attack ids', () => {
    const getFieldsData = () => ['attack-id-1', 'attack-id-2'];
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return false if setting is enabled and attack ids are empty', () => {
    const getFieldsData = () => [];
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({
      show: false,
      attackIds: [],
    });
  });
});
