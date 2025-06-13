/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../../../flyout/entity_details/shared/constants';
import { padChartStyling } from './pad_chart';

export const UserNameList: React.FC<{ userNames: string[] }> = ({ userNames }) => {
  const { openRightPanel } = useExpandableFlyoutApi();

  const openUserFlyout = (userName: string) => {
    const id = EntityPanelKeyByType.user;

    if (id) {
      openRightPanel({
        id,
        params: {
          [EntityPanelParamByType.user ?? '']: userName,
          contextID: 'PadAnomalies-table',
          scopeId: 'PadAnomalies-table',
        },
      });
    }
  };

  return (
    <EuiFlexItem
      css={{
        marginTop: `${padChartStyling.heightOfTopLegend}px`,
        height: `${padChartStyling.heightOfUserNamesList(userNames)}px`,
      }}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {userNames.map((eachUserName) => (
          <EuiFlexItem
            css={{ justifyContent: 'center', height: padChartStyling.heightOfEachCell }}
            grow={false}
          >
            <EuiText textAlign={'right'}>
              <EuiLink
                onClick={() => {
                  openUserFlyout(eachUserName);
                }}
              >
                <p style={{ margin: '0' }}>{eachUserName}</p>
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
