/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiText, EuiToolTip, EuiSpacer } from '@elastic/eui';
import { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import {
  getShortTimeStamp,
  parseTimestamp,
} from '../../../../../../../../../common/utils/date_util';
import {
  MonitorTypeEnum,
  OverviewStatusMetaData,
} from '../../../../../../../../../common/runtime_types';
import { BadgeStatus } from '../../../../../common/components/monitor_status';

export const MonitorStatusCol = ({
  monitor,
  openFlyout,
}: {
  monitor: OverviewStatusMetaData;
  openFlyout: (monitor: OverviewStatusMetaData) => void;
}) => {
  const timestamp = monitor.timestamp ? parseTimestamp(monitor.timestamp) : null;

  return (
    <div>
      <BadgeStatus
        status={monitor.status}
        isBrowserType={monitor.type === MonitorTypeEnum.BROWSER}
        onClickBadge={() => openFlyout(monitor)}
      />
      <EuiSpacer size="xs" />
      {timestamp ? (
        <EuiToolTip
          content={
            <>
              <EuiText color="text" size="xs">
                <strong> {timestamp.fromNow()}</strong>
              </EuiText>
              <EuiHorizontalRule margin="xs" />
              <EuiText color="ghost" size="xs">
                {timestamp.toLocaleString()}
              </EuiText>
            </>
          }
        >
          <EuiText size="xs" color="subdued" className="eui-textNoWrap">
            {getCheckedLabel(timestamp)}
          </EuiText>
        </EuiToolTip>
      ) : (
        '--'
      )}
    </div>
  );
};

const getCheckedLabel = (timestamp: Moment) => {
  return i18n.translate('xpack.synthetics.monitorList.statusColumn.checkedTimestamp', {
    defaultMessage: 'Checked {timestamp}',
    values: { timestamp: getShortTimeStamp(timestamp) },
  });
};
