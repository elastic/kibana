/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { APP_ID } from '../../../../common/constants';

import { useKibana } from '../../lib/kibana';
interface Props<T> {
  defaultValue: T;
  isInvalidDefault?: (value: T) => boolean;
  key: string;
  plugin?: string;
}

/** Reads and writes settings from local storage */
export const useLocalStorage = <T,>({
  defaultValue,
  key,
  plugin = APP_ID,
  isInvalidDefault,
}: Props<T>): [T, Dispatch<SetStateAction<T>>, Dispatch<SetStateAction<boolean>>] => {
  const { storage } = useKibana().services;
  const [initialized, setInitialized] = useState<boolean>(false);
  const [_value, _setValue] = useState<T>(defaultValue);

  const readValueFromLocalStorage = useCallback(() => {
    const value = storage.get(`${plugin}.${key}`);
    const valueAndDefaultTypesAreDifferent = typeof value !== typeof defaultValue;
    const valueIsInvalid = isInvalidDefault != null && isInvalidDefault(value);

    _setValue(valueAndDefaultTypesAreDifferent || valueIsInvalid ? defaultValue : value);
  }, [defaultValue, isInvalidDefault, key, plugin, storage]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof value === 'function') {
        const updater = value as (prev: T) => T;
        _setValue((prevValue) => {
          const newValue = updater(prevValue);
          storage.set(`${plugin}.${key}`, newValue);
          return newValue;
        });
      } else {
        storage.set(`${plugin}.${key}`, value);
        _setValue(value);
      }
    },
    [key, plugin, storage]
  );

  useEffect(() => {
    if (!initialized) {
      readValueFromLocalStorage();
      setInitialized(true);
    }
  }, [initialized, readValueFromLocalStorage]);

  return [_value, setValue, setInitialized];
};
