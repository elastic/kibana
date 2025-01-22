/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { APP_ID } from '../../../../common/constants';
import { DEFAULT_STACK_BY_FIELD } from '../../../detections/components/alerts_kpis/common/config';
import {
  ALERTS_PAGE,
  EXPAND_SETTING_NAME,
  STACK_BY_SETTING_NAME,
  TREEMAP_CATEGORY,
} from '../../../detections/components/alerts_kpis/chart_panels/alerts_local_storage/constants';
import { getSettingKey, isDefaultWhenEmptyString } from './helpers';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { useLocalStorage } from '.';

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    storage: {
      ...mockUseKibana().services.storage,
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

jest.mock('../../lib/kibana', () => {
  return {
    useKibana: () => mockedUseKibana,
  };
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it returns the expected value from local storage', async () => {
    const mockLocalStorageValue = 'baz';
    mockedUseKibana.services.storage.get.mockReturnValue(mockLocalStorageValue);

    const { result } = renderHook(() =>
      useLocalStorage<string>({
        defaultValue: DEFAULT_STACK_BY_FIELD,
        key: getSettingKey({
          category: TREEMAP_CATEGORY,
          page: ALERTS_PAGE,
          setting: STACK_BY_SETTING_NAME,
        }),
        plugin: APP_ID,
      })
    );

    const [riskVisualizationStackBy] = result.current;

    expect(riskVisualizationStackBy).toEqual(mockLocalStorageValue);
  });

  test('it returns the expected default when the value in local storage is undefined', async () => {
    const { result } = renderHook(() =>
      useLocalStorage<boolean>({
        defaultValue: true,
        key: getSettingKey({
          category: TREEMAP_CATEGORY,
          page: ALERTS_PAGE,
          setting: EXPAND_SETTING_NAME,
        }),
        plugin: APP_ID,
      })
    );

    const [riskVisualizationStackBy] = result.current;

    expect(riskVisualizationStackBy).toEqual(true);
  });

  test('it returns the expected default when the type of the value in local storage does not match the default', async () => {
    const mockLocalStorageValue = 'abcd'; // <-- this type does not match the type of the expected default value
    mockedUseKibana.services.storage.get.mockReturnValue(mockLocalStorageValue);

    const { result } = renderHook(() =>
      useLocalStorage<number>({
        defaultValue: 1234,
        key: getSettingKey({
          category: TREEMAP_CATEGORY,
          page: ALERTS_PAGE,
          setting: EXPAND_SETTING_NAME,
        }),
        plugin: APP_ID,
      })
    );

    const [riskVisualizationStackBy] = result.current;

    expect(riskVisualizationStackBy).toEqual(1234);
  });

  describe('setValue', () => {
    test('it updates local storage', async () => {
      const newValue = 'bazfact';

      const { result } = renderHook(() =>
        useLocalStorage<string>({
          defaultValue: DEFAULT_STACK_BY_FIELD,
          key: getSettingKey({
            category: TREEMAP_CATEGORY,
            page: ALERTS_PAGE,
            setting: STACK_BY_SETTING_NAME,
          }),
          plugin: APP_ID,
          isInvalidDefault: isDefaultWhenEmptyString,
        })
      );

      const [_, setValue] = result.current;

      act(() => setValue(newValue));

      expect(mockedUseKibana.services.storage.set).toBeCalledWith(
        `${APP_ID}.${getSettingKey({
          category: TREEMAP_CATEGORY,
          page: ALERTS_PAGE,
          setting: STACK_BY_SETTING_NAME,
        })}`,
        newValue
      );
    });
  });

  describe('isInvalidDefault', () => {
    test('it returns the expected default value when the value in local storage matches the value returned by isInvalidDefault', async () => {
      const mockLocalStorageValue = ''; // <-- this matches the value specified by isInvalidDefault
      mockedUseKibana.services.storage.get.mockReturnValue(mockLocalStorageValue);

      const { result } = renderHook(() =>
        useLocalStorage<string>({
          defaultValue: DEFAULT_STACK_BY_FIELD,
          key: getSettingKey({
            category: TREEMAP_CATEGORY,
            page: ALERTS_PAGE,
            setting: STACK_BY_SETTING_NAME,
          }),
          plugin: APP_ID,
          isInvalidDefault: isDefaultWhenEmptyString,
        })
      );

      const [riskVisualizationStackBy] = result.current;

      expect(riskVisualizationStackBy).toEqual(DEFAULT_STACK_BY_FIELD);
    });

    test('it returns the value from local storage when it does NOT match the value returned by isInvalidDefault', async () => {
      const mockLocalStorageValue = 'totally valid'; // <-- this matches the value specified by isInvalidDefault
      mockedUseKibana.services.storage.get.mockReturnValue(mockLocalStorageValue);

      const { result } = renderHook(() =>
        useLocalStorage<string>({
          defaultValue: DEFAULT_STACK_BY_FIELD,
          key: getSettingKey({
            category: TREEMAP_CATEGORY,
            page: ALERTS_PAGE,
            setting: STACK_BY_SETTING_NAME,
          }),
          plugin: APP_ID,
          isInvalidDefault: isDefaultWhenEmptyString,
        })
      );

      const [riskVisualizationStackBy] = result.current;

      expect(riskVisualizationStackBy).toEqual(mockLocalStorageValue);
    });
  });
});
