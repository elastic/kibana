/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiPanel, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { MotionLoader, ShimmeringText, useWorkersRunningShimmer } from '@kbn/custom-content-renderer';

const TITLE = i18n.translate('xpack.alertzero.workersRunningPanel.title', {
  defaultMessage: 'Workers are running in the background',
});

const LOADER_SIZE = 24;

export const WorkersRunningPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const statusFontSize = useEuiFontSize('s');
  const shimmer = useWorkersRunningShimmer();

  const statusStyles = css`
    ${statusFontSize}
    color: ${euiTheme.colors.textDisabled};
  `;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="xl"
      data-test-subj="alertZeroWorkersRunningPanel"
    >
      <EuiEmptyPrompt
        icon={<MotionLoader scenario="workersRunning" size={LOADER_SIZE} decorative />}
        paddingSize="none"
        body={
          <p role="heading" aria-level={2}>
            <span css={statusStyles}>
              <ShimmeringText text={TITLE} enabled={shimmer} />
            </span>
          </p>
        }
      />
    </EuiPanel>
  );
};
