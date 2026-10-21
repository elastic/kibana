/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiComboBox, EuiSelect, EuiSwitch, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import {
  ALERT_TRIAGE_DEFAULT_EXTRAS,
  AlertTriageWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { MinimumConfidenceScoreField } from '../components/minimum_confidence_score_field';
import { SettingRow } from '../components/setting_row';
import * as i18n from '../settings_translations';
import type { WorkerCustomSettingsComponent } from './types';

/** The server projects complete extras; fall back to the defaults rather than crash a render. */
const readAlertTriageExtras = (settings: WorkerSettings): AlertTriageWorkerExtras => {
  const parsed = AlertTriageWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : ALERT_TRIAGE_DEFAULT_EXTRAS;
};

const SEVERITY_OPTIONS: Array<{ value: AlertTriageWorkerExtras['minSeverity']; text: string }> = [
  { value: 'low', text: i18n.SEVERITY_LOW },
  { value: 'medium', text: i18n.SEVERITY_MEDIUM },
  { value: 'high', text: i18n.SEVERITY_HIGH },
  { value: 'critical', text: i18n.SEVERITY_CRITICAL },
];

const SEVERITY_SELECT_WIDTH_PX = 160;

const DETAIL_MAX_WIDTH_PX = 480;

/** Longer explanation shown under a control, where the wide column has room for it. */
const SettingDetail: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <EuiText
    size="xs"
    color="subdued"
    css={css`
      max-width: ${DETAIL_MAX_WIDTH_PX}px;
      margin-top: 8px;
    `}
  >
    <p
      id={id}
      css={css`
        margin: 0;
      `}
    >
      {children}
    </p>
  </EuiText>
);

/**
 * Watch-owned controls for the Alert Triage Worker's extras. Every change hands the complete
 * `extras` object back to the page draft.
 */
export const AlertTriageSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readAlertTriageExtras(settings);
  const confidenceDetailId = useGeneratedHtmlId({ prefix: 'alertZeroConfidenceDetail' });
  const severityDetailId = useGeneratedHtmlId({ prefix: 'alertZeroSeverityDetail' });
  const buildingBlocksDetailId = useGeneratedHtmlId({ prefix: 'alertZeroBuildingBlocksDetail' });
  const ruleTagsDetailId = useGeneratedHtmlId({ prefix: 'alertZeroRuleTagsDetail' });

  return (
    <>
      <SettingRow
        label={i18n.MINIMUM_CONFIDENCE_SCORE_LABEL}
        labelHelp={i18n.MINIMUM_CONFIDENCE_SCORE_HELP_TEXT}
        data-test-subj="alertZeroMinimumConfidenceScoreRow"
      >
        <MinimumConfidenceScoreField
          current={extras.autoCloseConfidenceScoreMinThreshold}
          isDisabled={isDisabled}
          onChange={(autoCloseConfidenceScoreMinThreshold) =>
            onExtrasChange({ ...extras, autoCloseConfidenceScoreMinThreshold })
          }
        />
        <SettingDetail id={confidenceDetailId}>
          {i18n.MINIMUM_CONFIDENCE_SCORE_DETAIL_TEXT}
        </SettingDetail>
      </SettingRow>
      <SettingRow
        label={i18n.MINIMUM_SEVERITY_LABEL}
        labelHelp={i18n.MINIMUM_SEVERITY_HELP_TEXT}
        data-test-subj="alertZeroMinimumSeverityRow"
      >
        <EuiSelect
          compressed
          options={SEVERITY_OPTIONS}
          value={extras.minSeverity}
          disabled={isDisabled}
          onChange={({ target }) =>
            onExtrasChange({
              ...extras,
              minSeverity: target.value as AlertTriageWorkerExtras['minSeverity'],
            })
          }
          aria-label={i18n.MINIMUM_SEVERITY_LABEL}
          aria-describedby={severityDetailId}
          css={css`
            width: ${SEVERITY_SELECT_WIDTH_PX}px;
          `}
          data-test-subj="alertZeroMinimumSeveritySelect"
        />
        <SettingDetail id={severityDetailId}>{i18n.MINIMUM_SEVERITY_DETAIL_TEXT}</SettingDetail>
      </SettingRow>
      <SettingRow
        label={i18n.EXCLUDE_BUILDING_BLOCKS_LABEL}
        labelHelp={i18n.EXCLUDE_BUILDING_BLOCKS_HELP_TEXT}
        data-test-subj="alertZeroExcludeBuildingBlocksRow"
      >
        <EuiSwitch
          compressed
          label={i18n.EXCLUDE_BUILDING_BLOCKS_LABEL}
          showLabel={false}
          checked={extras.excludeBuildingBlocks}
          disabled={isDisabled}
          onChange={({ target }) =>
            onExtrasChange({ ...extras, excludeBuildingBlocks: target.checked })
          }
          aria-describedby={buildingBlocksDetailId}
          data-test-subj="alertZeroExcludeBuildingBlocksSwitch"
        />
        <SettingDetail id={buildingBlocksDetailId}>
          {i18n.EXCLUDE_BUILDING_BLOCKS_DETAIL_TEXT}
        </SettingDetail>
      </SettingRow>
      <SettingRow
        label={i18n.EXCLUDED_RULE_TAGS_LABEL}
        labelHelp={i18n.EXCLUDED_RULE_TAGS_HELP_TEXT}
        data-test-subj="alertZeroExcludedRuleTagsRow"
      >
        <EuiComboBox
          compressed
          noSuggestions
          placeholder={i18n.EXCLUDED_RULE_TAGS_PLACEHOLDER}
          selectedOptions={extras.excludedRuleTags.map((label) => ({ label }))}
          isDisabled={isDisabled}
          onCreateOption={(tag) => {
            const trimmed = tag.trim();
            if (trimmed.length === 0 || extras.excludedRuleTags.includes(trimmed)) return;
            onExtrasChange({ ...extras, excludedRuleTags: [...extras.excludedRuleTags, trimmed] });
          }}
          onChange={(options) =>
            onExtrasChange({ ...extras, excludedRuleTags: options.map(({ label }) => label) })
          }
          aria-label={i18n.EXCLUDED_RULE_TAGS_LABEL}
          aria-describedby={ruleTagsDetailId}
          data-test-subj="alertZeroExcludedRuleTagsInput"
        />
        <SettingDetail id={ruleTagsDetailId}>{i18n.EXCLUDED_RULE_TAGS_DETAIL_TEXT}</SettingDetail>
      </SettingRow>
    </>
  );
};
