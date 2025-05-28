/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { GenerationTiming } from './generation_timing';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';
import * as i18n from './translations';

interface Props {
  connectorIntervals: GenerationInterval[];
  successfulGenerations?: number;
}

const LastTimesPopoverComponent: React.FC<Props> = ({
  connectorIntervals,
  successfulGenerations,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const calculatedBy = attackDiscoveryAlertsEnabled
    ? successfulGenerations ?? 0
    : connectorIntervals.length;

  return (
    <EuiFlexGroup
      css={css`
        width: 300px;
      `}
      data-test-subj="lastTimesPopover"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        <EuiText
          color={isDarkMode ? 'subdued' : 'default'}
          data-test-subj="averageTimeIsCalculated"
          size="s"
        >
          {i18n.AVERAGE_TIME_IS_CALCULATED(calculatedBy)}
        </EuiText>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      {connectorIntervals.map((interval, index) => (
        <EuiFlexItem
          css={css`
            margin-bottom: ${euiTheme.size.xs};
          `}
          grow={false}
          key={index}
        >
          <GenerationTiming interval={interval} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

LastTimesPopoverComponent.displayName = 'LastTimesPopoverComponent';

export const LastTimesPopover = React.memo(LastTimesPopoverComponent);
