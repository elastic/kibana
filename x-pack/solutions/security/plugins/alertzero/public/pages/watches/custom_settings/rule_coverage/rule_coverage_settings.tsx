/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  LOOKBACK_DAYS_MAX,
  LOOKBACK_DAYS_MIN,
  MAX_GAPS_PER_RUN_MAX,
  MAX_GAPS_PER_RUN_MIN,
  RULE_COVERAGE_DEFAULT_EXTRAS,
  RuleCoverageWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { SettingRow } from '../../components/setting_row';
import { BoundedNumberField } from '../bounded_number_field';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

const readRuleCoverageExtras = (settings: WorkerSettings): RuleCoverageWorkerExtras => {
  const parsed = RuleCoverageWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : RULE_COVERAGE_DEFAULT_EXTRAS;
};

export const RuleCoverageSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readRuleCoverageExtras(settings);

  return (
    <>
      <SettingRow
        label={i18n.LOOKBACK_DAYS_LABEL}
        labelHelp={i18n.LOOKBACK_DAYS_HELP}
        data-test-subj="alertZeroLookbackDaysRow"
      >
        <BoundedNumberField
          value={extras.lookbackDays}
          min={LOOKBACK_DAYS_MIN}
          max={LOOKBACK_DAYS_MAX}
          ariaLabel={i18n.LOOKBACK_DAYS_ARIA_LABEL}
          testSubj="alertZeroLookbackDays"
          isDisabled={isDisabled}
          onChange={(lookbackDays) => onExtrasChange({ ...extras, lookbackDays })}
        />
      </SettingRow>
      <SettingRow
        label={i18n.MAX_GAPS_PER_RUN_LABEL}
        labelHelp={i18n.MAX_GAPS_PER_RUN_HELP}
        data-test-subj="alertZeroMaxGapsPerRunRow"
      >
        <BoundedNumberField
          value={extras.maxGapsPerRun}
          min={MAX_GAPS_PER_RUN_MIN}
          max={MAX_GAPS_PER_RUN_MAX}
          ariaLabel={i18n.MAX_GAPS_PER_RUN_ARIA_LABEL}
          testSubj="alertZeroMaxGapsPerRun"
          isDisabled={isDisabled}
          onChange={(maxGapsPerRun) => onExtrasChange({ ...extras, maxGapsPerRun })}
        />
      </SettingRow>
    </>
  );
};
