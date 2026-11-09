/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAgentLoader,
  EuiEmptyPrompt,
  EuiPanel,
  EuiShimmeringText,
  useEuiFontSize,
} from '@elastic/eui';

const TITLE = i18n.translate('xpack.alertzero.workersRunningPanel.title', {
  defaultMessage: 'Workers are running in the background',
});

const LOADING_LABEL = i18n.translate('xpack.alertzero.workersRunningPanel.loadingLabel', {
  defaultMessage: 'Workers are running',
});

export const WorkersRunningPanel: React.FC = () => {
  // EuiShimmeringText sets the `m` size inline. EuiText `xs` is `m` scaled by `xs` (12px).
  const titleFont = useEuiFontSize('m', { customScale: 'xs' });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="xl"
      data-test-subj="alertZeroWorkersRunningPanel"
    >
      <EuiEmptyPrompt
        // POC: same slot as the motion-refresh orbit loader. Size m is 16px.
        icon={<EuiAgentLoader size="m" aria-label={LOADING_LABEL} />}
        paddingSize="none"
        titleSize="xs"
        title={
          <h4>
            <EuiShimmeringText style={titleFont}>{TITLE}</EuiShimmeringText>
          </h4>
        }
      />
    </EuiPanel>
  );
};
