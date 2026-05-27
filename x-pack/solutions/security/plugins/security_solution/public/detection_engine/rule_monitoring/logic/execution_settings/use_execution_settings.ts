/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUiSetting$ } from '../../../../common/lib/kibana';

import { EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING } from '../../../../../common/constants';
import type { RuleExecutionSettings } from '../../../../../common/api/detection_engine/rule_monitoring';
import { LogLevelSetting } from '../../../../../common/api/detection_engine/rule_monitoring';

export const useRuleExecutionSettings = (): RuleExecutionSettings => {
  const featureFlagEnabled = useIsExperimentalFeatureEnabled('extendedRuleExecutionLoggingEnabled');

  const minLevel = useAdvancedSettingSafely<LogLevelSetting>(
    EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
    featureFlagEnabled ? LogLevelSetting.info : LogLevelSetting.off
  );

  return useMemo<RuleExecutionSettings>(() => {
    return {
      extendedLogging: {
        isEnabled: featureFlagEnabled && minLevel !== LogLevelSetting.off,
        minLevel,
      },
    };
  }, [featureFlagEnabled, minLevel]);
};

const useAdvancedSettingSafely = <T>(key: string, defaultValue: T): T => {
  try {
    const [value] = useUiSetting$<T>(key);
    return value;
  } catch (e) {
    return defaultValue;
  }
};
