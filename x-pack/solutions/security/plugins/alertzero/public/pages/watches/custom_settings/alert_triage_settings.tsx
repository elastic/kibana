/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiComboBox,
  EuiFormErrorText,
  EuiSelect,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ALERT_TRIAGE_DEFAULT_EXTRAS,
  EXCLUDED_RULE_TAG_MAX_LENGTH,
  EXCLUDED_RULE_TAGS_MAX_COUNT,
  AlertTriageWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { MinimumConfidenceScoreField } from '../components/minimum_confidence_score_field';
import { SettingRow } from '../components/setting_row';
import * as i18n from '../settings_translations';
import type { WorkerCustomSettingsComponent } from './types';

/**
 * The server projects complete extras. A field that fails validation falls back to its own default
 * rather than resetting every control, so one bad value never discards the user's other edits.
 */
const readAlertTriageExtras = (settings: WorkerSettings): AlertTriageWorkerExtras => {
  const parsed = AlertTriageWorkerExtras.safeParse(settings.extras);
  if (parsed.success) return parsed.data;
  const stored: Record<string, unknown> =
    typeof settings.extras === 'object' && settings.extras !== null ? settings.extras : {};
  const isValidField = (key: keyof AlertTriageWorkerExtras): boolean =>
    AlertTriageWorkerExtras.safeParse({ ...ALERT_TRIAGE_DEFAULT_EXTRAS, [key]: stored[key] })
      .success;
  const fields = Object.keys(ALERT_TRIAGE_DEFAULT_EXTRAS) as Array<keyof AlertTriageWorkerExtras>;
  return Object.fromEntries(
    fields.map((key) => [key, isValidField(key) ? stored[key] : ALERT_TRIAGE_DEFAULT_EXTRAS[key]])
  ) as AlertTriageWorkerExtras;
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
  const [tagError, setTagError] = useState<string>();

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
        {/* The width sits on a wrapper: EUI places the chevron against the wrapper, not the <select>. */}
        <div
          css={css`
            width: ${SEVERITY_SELECT_WIDTH_PX}px;
          `}
        >
          <EuiSelect
            compressed
            fullWidth
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
            data-test-subj="alertZeroMinimumSeveritySelect"
          />
        </div>
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
          // EUI keys pills by lowercased label unless given a key, so `Dev` and `dev` would collide.
          selectedOptions={extras.excludedRuleTags.map((label) => ({ label, key: label }))}
          isDisabled={isDisabled}
          isCaseSensitive
          isInvalid={tagError !== undefined}
          // EUI clears the search box after a create attempt, which must not clear the error it just set.
          onSearchChange={(search) => {
            if (search !== '') setTagError(undefined);
          }}
          onCreateOption={(tag) => {
            const trimmed = tag.trim();
            if (trimmed.length === 0 || extras.excludedRuleTags.includes(trimmed)) return;
            if (trimmed.length > EXCLUDED_RULE_TAG_MAX_LENGTH) {
              setTagError(i18n.excludedRuleTagTooLong(EXCLUDED_RULE_TAG_MAX_LENGTH));
              return;
            }
            if (extras.excludedRuleTags.length >= EXCLUDED_RULE_TAGS_MAX_COUNT) {
              setTagError(i18n.excludedRuleTagsLimitReached(EXCLUDED_RULE_TAGS_MAX_COUNT));
              return;
            }
            onExtrasChange({ ...extras, excludedRuleTags: [...extras.excludedRuleTags, trimmed] });
          }}
          onChange={(options) =>
            onExtrasChange({ ...extras, excludedRuleTags: options.map(({ label }) => label) })
          }
          aria-label={i18n.EXCLUDED_RULE_TAGS_LABEL}
          aria-describedby={ruleTagsDetailId}
          data-test-subj="alertZeroExcludedRuleTagsInput"
        />
        {tagError !== undefined && (
          <EuiFormErrorText data-test-subj="alertZeroExcludedRuleTagsError">
            {tagError}
          </EuiFormErrorText>
        )}
        <SettingDetail id={ruleTagsDetailId}>{i18n.EXCLUDED_RULE_TAGS_DETAIL_TEXT}</SettingDetail>
      </SettingRow>
    </>
  );
};
