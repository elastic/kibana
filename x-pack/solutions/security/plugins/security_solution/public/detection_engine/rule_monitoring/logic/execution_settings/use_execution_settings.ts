/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';

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
  // Unlike `useUiSetting$`, fall back to the default instead of throwing when the Kibana
  // context has no settings service.
  const { settings } = useKibana().services;
  const value$ = useMemo(
    () => (settings ? settings.client.get$<T>(key) : of(defaultValue)),
    [settings, key, defaultValue]
  );
  return useObservable(value$, settings ? settings.client.get<T>(key) : defaultValue);
};
