/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText, useGeneratedHtmlId } from '@elastic/eui';
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
    </>
  );
};
