/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype BA-v.3 error empty prompt — shared by the left-tab error state
 * and the right-panel overview error state.
 *
 * Cleanup: delete with the State selector wiring.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { EuiIconProps, EuiTitleProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiIcon, useEuiFontSize } from '@elastic/eui';
import {
  BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_BODY,
  BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_REFRESH_BUTTON,
  BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_TITLE,
} from './translations';
import {
  BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_REFRESH_BUTTON_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_TEST_ID,
} from './test_ids';

export type BehavioralAnomaliesV3ErrorPromptVariant = 'leftTab' | 'rightOverview';

interface BehavioralAnomaliesV3ErrorPromptProps {
  variant: BehavioralAnomaliesV3ErrorPromptVariant;
}

const VARIANT_CONFIG: Record<
  BehavioralAnomaliesV3ErrorPromptVariant,
  {
    titleSize: EuiTitleProps['size'];
    iconSize: EuiIconProps['size'];
    showRefreshAction: boolean;
  }
> = {
  leftTab: {
    titleSize: 'xs',
    iconSize: 'xl',
    showRefreshAction: true,
  },
  rightOverview: {
    titleSize: 'xs',
    iconSize: 'xl',
    showRefreshAction: true,
  },
};

export const BehavioralAnomaliesV3ErrorPrompt: React.FC<BehavioralAnomaliesV3ErrorPromptProps> = ({
  variant,
}) => {
  const bodyFontSize = useEuiFontSize('s').fontSize;
  const { titleSize, iconSize, showRefreshAction } = VARIANT_CONFIG[variant];

  const handleRefreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <EuiEmptyPrompt
      color="danger"
      icon={<EuiIcon type="error" size={iconSize} color="danger" />}
      data-test-subj={BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_TEST_ID}
      title={<h4>{BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_TITLE}</h4>}
      titleSize={titleSize}
      body={
        <p
          css={css`
            font-size: ${bodyFontSize};
          `}
        >
          {BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_BODY}
        </p>
      }
      actions={
        showRefreshAction ? (
          <EuiButtonEmpty
            size="s"
            iconType="refresh"
            iconSide="left"
            onClick={handleRefreshPage}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_REFRESH_BUTTON_TEST_ID}
          >
            {BEHAVIORAL_ANOMALIES_V3_STATE_ERROR_REFRESH_BUTTON}
          </EuiButtonEmpty>
        ) : undefined
      }
    />
  );
};
