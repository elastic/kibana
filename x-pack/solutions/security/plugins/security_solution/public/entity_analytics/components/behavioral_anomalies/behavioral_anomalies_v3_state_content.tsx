/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype-only v.3 section states (empty / loading / error) for the
 * Behavioral anomalies right-panel section. Toggled via the temporary State
 * selector in `behavioral_anomalies_section.tsx`.
 *
 * Cleanup: delete this file together with the State selector when v.3 ships.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiFontSize,
} from '@elastic/eui';
import {
  BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_BODY,
  BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_TITLE,
  BEHAVIORAL_ANOMALIES_V3_STATE_LOADING_LABEL,
} from './translations';
import type { BehavioralAnomaliesV3ContentState } from './behavioral_anomalies_v3_content_state';
export type { BehavioralAnomaliesV3ContentState } from './behavioral_anomalies_v3_content_state';
import {
  BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_STATE_LOADING_TEST_ID,
} from './test_ids';
import { BehavioralAnomaliesV3ErrorPrompt } from './behavioral_anomalies_v3_error_prompt';

interface BehavioralAnomaliesV3StateContentProps {
  state: Exclude<BehavioralAnomaliesV3ContentState, 'full'>;
}

export const BehavioralAnomaliesV3StateContent: React.FC<BehavioralAnomaliesV3StateContentProps> = ({
  state,
}) => {
  const bodyFontSize = useEuiFontSize('s').fontSize;

  if (state === 'loading') {
    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        responsive={false}
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_STATE_LOADING_TEST_ID}
        css={css`
          min-height: 120px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <p
            css={css`
              font-size: ${bodyFontSize};
              color: inherit;
              margin: 0;
            `}
          >
            {BEHAVIORAL_ANOMALIES_V3_STATE_LOADING_LABEL}
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (state === 'empty') {
    return (
      <EuiEmptyPrompt
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_TEST_ID}
        title={<h4>{BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_TITLE}</h4>}
        body={BEHAVIORAL_ANOMALIES_V3_STATE_EMPTY_BODY}
        titleSize="s"
      />
    );
  }

  return <BehavioralAnomaliesV3ErrorPrompt variant="leftTab" />;
};
