/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';

import type {
  LogLevel,
  RuleExecutionEventType,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import type { DateRange } from '../../api';

export const useFilters = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [logLevels, setLogLevels] = useState<LogLevel[]>([]);
  const [eventTypes, setEventTypes] = useState<RuleExecutionEventType[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: 'now-24h',
    end: 'now',
  });
  const state = useMemo(
    () => ({ searchTerm, logLevels, eventTypes, dateRange }),
    [searchTerm, logLevels, eventTypes, dateRange]
  );

  return useMemo(
    () => ({
      state,
      setSearchTerm,
      setLogLevels,
      setEventTypes,
      setDateRange,
    }),
    [state, setSearchTerm, setLogLevels, setEventTypes, setDateRange]
  );
};
