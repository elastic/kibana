/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  HISTORY_END_LOCAL_STORAGE_KEY,
  HISTORY_START_LOCAL_STORAGE_KEY,
} from '@kbn/elastic-assistant';

interface UseAttackDiscoveryTimerange {
  historyStart: string;
  setHistoryStart: React.Dispatch<React.SetStateAction<string | undefined>>;
  historyEnd: string;
  setHistoryEnd: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const DEFAULT_HISTORY_END = 'now';
const DEFAULT_HISTORY_START = 'now-24h';
export const useAttackDiscoveryHistoryTimerange = (): UseAttackDiscoveryTimerange => {
  // history time selection:
  const [historyStart, setHistoryStart] = useLocalStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${HISTORY_START_LOCAL_STORAGE_KEY}`,
    DEFAULT_HISTORY_START
  );
  const [historyEnd, setHistoryEnd] = useLocalStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${HISTORY_END_LOCAL_STORAGE_KEY}`,
    DEFAULT_HISTORY_END
  );

  return {
    historyStart: historyStart ?? DEFAULT_HISTORY_START,
    setHistoryStart,
    historyEnd: historyEnd ?? DEFAULT_HISTORY_END,
    setHistoryEnd,
  };
};
