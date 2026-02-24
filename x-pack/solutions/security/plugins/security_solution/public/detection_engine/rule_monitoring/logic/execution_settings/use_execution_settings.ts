/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useUiSetting$ } from '../../../../common/lib/kibana';

import { EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING } from '../../../../../common/constants';
import type {
  RuleExecutionSettings,
  LogLevelSetting,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import {
  DEFAULT_EXTENDED_LOGGING_SETTINGS,
  getExtendedLoggingSettings,
} from '../../../../../common/api/detection_engine/rule_monitoring';

export const useRuleExecutionSettings = (): RuleExecutionSettings => {
  const minLevel = useAdvancedSettingSafely<LogLevelSetting>(
    EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
    DEFAULT_EXTENDED_LOGGING_SETTINGS.minLevel
  );

  return useMemo<RuleExecutionSettings>(() => {
    return { extendedLogging: getExtendedLoggingSettings(minLevel) };
  }, [minLevel]);
};

const useAdvancedSettingSafely = <T>(key: string, defaultValue: T): T => {
  try {
    const [value] = useUiSetting$<T>(key);
    return value;
  } catch (e) {
    return defaultValue;
  }
};
