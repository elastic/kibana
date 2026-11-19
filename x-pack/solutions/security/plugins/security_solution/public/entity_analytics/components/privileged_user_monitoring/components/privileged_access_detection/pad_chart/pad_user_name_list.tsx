/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { anomalyChartStyling } from '../../../../recent_anomalies/anomaly_chart_styling';
import { FLYOUT_ORIGIN } from '../../../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../../../flyout_v2/use_flyout_api';

const PRIVILEGED_ACCESS_DETECTION_TABLE_ID = 'PadAnomalies-table';

export const UserNameList: React.FC<{ userNames: string[] }> = ({ userNames }) => {
  const { openUserFlyout } = useFlyoutApi();

  const openUserDetails = (userName: string) => {
    openUserFlyout({
      userName,
      scopeId: PRIVILEGED_ACCESS_DETECTION_TABLE_ID,
      contextID: PRIVILEGED_ACCESS_DETECTION_TABLE_ID,
      origin: FLYOUT_ORIGIN.PRIVILEGED_ACCESS_DETECTION,
    });
  };

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${anomalyChartStyling.heightOfTopLegend}px;
        height: ${anomalyChartStyling.heightOfEntityNamesList(userNames.length)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {userNames.map((userName) => (
          <EuiFlexItem
            key={userName}
            css={css`
              justify-content: center;
              height: ${anomalyChartStyling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'}>
              <EuiLink
                onClick={() => {
                  openUserDetails(userName);
                }}
              >
                {userName}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
