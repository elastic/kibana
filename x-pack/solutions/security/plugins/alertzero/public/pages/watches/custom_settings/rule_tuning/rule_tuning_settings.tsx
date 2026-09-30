/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ANALYSIS_WINDOW_DAYS_MAX,
  ANALYSIS_WINDOW_DAYS_MIN,
  FP_COUNT_THRESHOLD_MAX,
  FP_COUNT_THRESHOLD_MIN,
  FP_RATE_THRESHOLD_PCT_MAX,
  FP_RATE_THRESHOLD_PCT_MIN,
  RULE_TUNING_DEFAULT_EXTRAS,
  RuleTuningWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { SettingRow } from '../../components/setting_row';
import { BoundedNumberField } from '../bounded_number_field';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

/** Control width from the design; the two thresholds sit side by side in the control column. */
const NUMBER_FIELD_WIDTH_PX = 200;

/** The server projects complete extras; fall back to the defaults rather than crash a render. */
const readRuleTuningExtras = (settings: WorkerSettings): RuleTuningWorkerExtras => {
  const parsed = RuleTuningWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : RULE_TUNING_DEFAULT_EXTRAS;
};

/**
 * Detection Watch controls for the Rule Tuning Worker, as two settings rows: the analysis window,
 * then the pair of qualifying thresholds a rule has to meet inside that window. Every change hands
 * the complete `extras` object back to the page draft; adding a field means adding its control and
 * spreading it here.
 */
export const RuleTuningSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const thresholdsHelpId = useGeneratedHtmlId({ prefix: 'alertZeroQualifyingThresholdsHelp' });
  const extras = readRuleTuningExtras(settings);
  const fieldWidth = css`
    width: ${NUMBER_FIELD_WIDTH_PX}px;
  `;

  return (
    <>
      <SettingRow
        label={i18n.ANALYSIS_WINDOW_DAYS_LABEL}
        labelHelp={i18n.ANALYSIS_WINDOW_DAYS_HELP}
        data-test-subj="alertZeroAnalysisWindowRow"
      >
        <div css={fieldWidth}>
          <BoundedNumberField
            value={extras.analysisWindowDays}
            min={ANALYSIS_WINDOW_DAYS_MIN}
            max={ANALYSIS_WINDOW_DAYS_MAX}
            ariaLabel={i18n.ANALYSIS_WINDOW_DAYS_ARIA_LABEL}
            testSubj="alertZeroAnalysisWindowDays"
            isDisabled={isDisabled}
            onChange={(analysisWindowDays) => onExtrasChange({ ...extras, analysisWindowDays })}
          />
        </div>
      </SettingRow>
      <SettingRow
        label={i18n.QUALIFYING_THRESHOLDS_LABEL}
        labelHelp={i18n.QUALIFYING_THRESHOLDS_HELP}
        data-test-subj="alertZeroQualifyingThresholdsRow"
      >
        <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false} wrap>
          <EuiFlexItem grow={false} css={fieldWidth}>
            <EuiFormRow label={i18n.FP_COUNT_THRESHOLD_LABEL}>
              <BoundedNumberField
                value={extras.fpCountThreshold}
                min={FP_COUNT_THRESHOLD_MIN}
                max={FP_COUNT_THRESHOLD_MAX}
                ariaLabel={i18n.FP_COUNT_THRESHOLD_ARIA_LABEL}
                ariaDescribedBy={thresholdsHelpId}
                testSubj="alertZeroFpCountThreshold"
                isDisabled={isDisabled}
                onChange={(fpCountThreshold) => onExtrasChange({ ...extras, fpCountThreshold })}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Empty label space keeps "and" level with the inputs, not their labels. */}
            <EuiFormRow hasEmptyLabelSpace>
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  line-height: ${euiTheme.size.xxl};
                `}
              >
                {i18n.QUALIFYING_THRESHOLDS_AND}
              </EuiText>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={fieldWidth}>
            <EuiFormRow label={i18n.FP_RATE_THRESHOLD_PCT_LABEL}>
              <BoundedNumberField
                value={extras.fpRateThresholdPct}
                min={FP_RATE_THRESHOLD_PCT_MIN}
                max={FP_RATE_THRESHOLD_PCT_MAX}
                ariaLabel={i18n.FP_RATE_THRESHOLD_PCT_ARIA_LABEL}
                ariaDescribedBy={thresholdsHelpId}
                testSubj="alertZeroFpRateThresholdPct"
                append="%"
                isDisabled={isDisabled}
                onChange={(fpRateThresholdPct) => onExtrasChange({ ...extras, fpRateThresholdPct })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText
          id={thresholdsHelpId}
          size="xs"
          color="subdued"
          data-test-subj="alertZeroQualifyingThresholdsHelp"
        >
          {i18n.QUALIFYING_THRESHOLDS_FIELDS_HELP}
        </EuiText>
      </SettingRow>
    </>
  );
};
