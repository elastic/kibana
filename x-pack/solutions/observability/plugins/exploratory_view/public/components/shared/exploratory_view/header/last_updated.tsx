/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { ChartCreationInfo } from './chart_creation_info';

export interface ChartTimeRange {
  lastUpdated: number;
  to?: number;
  from?: number;
}

export function LastUpdated() {
  const { chartTimeRangeContext } = useSeriesStorage();

  const { lastUpdated } = chartTimeRangeContext || {};
  const [refresh, setRefresh] = useState(() => Date.now());

  useEffect(() => {
    const interVal = setInterval(() => {
      setRefresh(Date.now());
    }, 5000);

    return () => {
      clearInterval(interVal);
    };
  }, []);

  useEffect(() => {
    setRefresh(Date.now());
  }, [lastUpdated]);

  if (!lastUpdated) {
    return null;
  }

  const isWarning = moment().diff(moment(lastUpdated), 'minute') > 5;
  const isDanger = moment().diff(moment(lastUpdated), 'minute') > 10;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={<ChartCreationInfo {...chartTimeRangeContext} />}>
          <EuiIcon type="info" />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color={isDanger ? 'danger' : isWarning ? 'warning' : 'subdued'} size="s">
          <FormattedMessage
            id="xpack.exploratoryView.expView.lastUpdated.label"
            defaultMessage="Last Updated: {updatedDate}"
            values={{
              updatedDate: moment(lastUpdated).from(refresh),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
