/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const LOCAL_STORAGE_UPDATE_EVENT_TYPE = 'customLocalStorage';

export function useLocalStorage<T extends AllowedValue>(
  key: string,
  defaultValue: T | (() => T)
): [T, SetValue<T>] {
  const defaultValueRef = useRef<T>(
    typeof defaultValue === 'function' ? defaultValue() : defaultValue
  );

  const [value, setValue] = useState(() => getFromStorage(key, defaultValueRef.current));

  const valueRef = useRef(value);
  valueRef.current = value;

  const setter = useMemo(() => {
    return (valueOrCallback: T | ((prev: T) => T)) => {
      const nextValue =
        typeof valueOrCallback === 'function' ? valueOrCallback(valueRef.current) : valueOrCallback;

      window.localStorage.setItem(key, JSON.stringify(nextValue));

      /*
       * This is necessary to trigger the event listener in the same
       * window context.
       */
      window.dispatchEvent(
        new window.CustomEvent<{ key: string }>(LOCAL_STORAGE_UPDATE_EVENT_TYPE, {
          detail: { key },
        })
      );
    };
  }, [key]);

  useEffect(() => {
    function updateValueFromStorage() {
      setValue(getFromStorage(key, defaultValueRef.current));
    }

    function onStorageEvent(event: StorageEvent) {
      if (event.key === key) {
        updateValueFromStorage();
      }
    }

    function onCustomLocalStorageEvent(event: Event) {
      if (event instanceof window.CustomEvent && event.detail?.key === key) {
        updateValueFromStorage();
      }
    }

    window.addEventListener('storage', onStorageEvent);
    window.addEventListener(LOCAL_STORAGE_UPDATE_EVENT_TYPE, onCustomLocalStorageEvent);

    return () => {
      window.removeEventListener('storage', onStorageEvent);
      window.removeEventListener(LOCAL_STORAGE_UPDATE_EVENT_TYPE, onCustomLocalStorageEvent);
    };
  }, [key]);

  return [value, setter];
}

type AllowedValue = string | number | boolean | Record<string, any> | any[];
type SetValue<T extends AllowedValue> = (next: T | ((prev: T) => T)) => void;

function getFromStorage<T>(keyName: string, defaultValue: T) {
  const storedItem = window.localStorage.getItem(keyName);

  if (storedItem !== null) {
    try {
      return JSON.parse(storedItem) as T;
    } catch (err) {
      window.localStorage.removeItem(keyName);
      // eslint-disable-next-line no-console
      console.log(`Unable to decode: ${keyName}`);
    }
  }
  return defaultValue;
}
