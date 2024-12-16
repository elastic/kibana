/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import moment from 'moment';
import { EuiDescriptionList, EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsLastRun: React.FC = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();
  let description: string | ReactElement = latestPing
    ? moment(latestPing.timestamp).fromNow()
    : '--';

  if (!latestPing && pingsLoading) {
    description = <EuiSkeletonText lines={1} />;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: LAST_RUN_LABEL,
          description: (
            <EuiToolTip content={moment(latestPing?.timestamp).format('LLL')} position="bottom">
              <>{description}</>
            </EuiToolTip>
          ),
        },
      ]}
    />
  );
};

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.monitorLastRun.lastRunLabel', {
  defaultMessage: 'Last run',
});
