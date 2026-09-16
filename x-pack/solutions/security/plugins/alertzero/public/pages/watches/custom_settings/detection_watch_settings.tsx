/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  ANALYSIS_WINDOW_DAYS_DEFAULT,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
} from '@kbn/alertzero-common';
import { AnalysisWindowDaysField } from '../components/analysis_window_days_field';
import * as i18n from '../settings_translations';
import type { WatchCustomSettingsComponent } from './types';

export const DetectionWatchSettings: WatchCustomSettingsComponent = ({
  worker,
  settings,
  isDisabled,
  onSettingsChange,
}) => {
  if (worker.id !== SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>{i18n.TUNING_THRESHOLDS_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AnalysisWindowDaysField
        current={settings.extras?.analysisWindowDays ?? ANALYSIS_WINDOW_DAYS_DEFAULT}
        isDisabled={isDisabled}
        onChange={(analysisWindowDays) => onSettingsChange({ extras: { analysisWindowDays } })}
      />
    </>
  );
};

DetectionWatchSettings.coveredFields = {
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: ['analysisWindowDays'],
};
