/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConsoleStore } from '../components/console_state/console_state';

export const useStorageKey = (suffix: string): string | undefined => {
  const prefix = useConsoleStore().state.storagePrefix;

  return useMemo(() => {
    return prefix ? `${prefix}.${suffix}` : undefined;
  }, [prefix, suffix]);
};
