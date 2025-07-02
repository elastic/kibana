/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { padChartStyling } from './pad_chart_styling';
import { UserPanelKey } from '../../../../../../flyout/entity_details/shared/constants';

const PRIVILEGED_ACCESS_DETECTION_TABLE_ID = 'PadAnomalies-table';

export const UserNameList: React.FC<{ userNames: string[] }> = ({ userNames }) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openUserFlyout = (userName: string) => {
    openFlyout({
      right: {
        id: UserPanelKey,
        params: {
          contextID: PRIVILEGED_ACCESS_DETECTION_TABLE_ID,
          userName,
          scopeId: PRIVILEGED_ACCESS_DETECTION_TABLE_ID,
        },
      },
    });
  };

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${padChartStyling.heightOfTopLegend}px;
        height: ${padChartStyling.heightOfUserNamesList(userNames)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {userNames.map((userName) => (
          <EuiFlexItem
            key={userName}
            css={css`
              justify-content: center;
              height: ${padChartStyling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'}>
              <EuiLink
                onClick={() => {
                  openUserFlyout(userName);
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
