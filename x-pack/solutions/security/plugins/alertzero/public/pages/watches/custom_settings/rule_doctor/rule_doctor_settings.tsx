/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSelect } from '@elastic/eui';
import {
  RULE_DOCTOR_DEFAULT_EXTRAS,
  RuleDoctorWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { SettingRow } from '../../components/setting_row';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

const readRuleDoctorExtras = (settings: WorkerSettings): RuleDoctorWorkerExtras => {
  const parsed = RuleDoctorWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : RULE_DOCTOR_DEFAULT_EXTRAS;
};

const OUTCOME_OPTIONS: Array<{ value: RuleDoctorWorkerExtras['ruleOutcomes']; text: string }> = [
  { value: 'failed_and_warning', text: i18n.RULE_OUTCOMES_FAILED_AND_WARNING },
  { value: 'failed', text: i18n.RULE_OUTCOMES_FAILED },
  { value: 'warning', text: i18n.RULE_OUTCOMES_WARNING },
];

const OUTCOME_SELECT_WIDTH_PX = 200;

export const RuleDoctorSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readRuleDoctorExtras(settings);

  return (
    <SettingRow
      label={i18n.RULE_OUTCOMES_LABEL}
      labelHelp={i18n.RULE_OUTCOMES_HELP}
      data-test-subj="alertZeroRuleOutcomesRow"
    >
      <div
        css={css`
          width: ${OUTCOME_SELECT_WIDTH_PX}px;
        `}
      >
        <EuiSelect
          compressed
          fullWidth
          options={OUTCOME_OPTIONS}
          value={extras.ruleOutcomes}
          disabled={isDisabled}
          onChange={({ target }) =>
            onExtrasChange({
              ...extras,
              ruleOutcomes: target.value as RuleDoctorWorkerExtras['ruleOutcomes'],
            })
          }
          aria-label={i18n.RULE_OUTCOMES_LABEL}
          data-test-subj="alertZeroRuleOutcomesSelect"
        />
      </div>
    </SettingRow>
  );
};
