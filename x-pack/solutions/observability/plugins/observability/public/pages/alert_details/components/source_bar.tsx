/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiTitle, EuiPanel, EuiFlexItem, EuiText } from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { ALERT_START, ALERT_END } from '@kbn/rule-data-utils';
import { TimeRange } from '@kbn/es-query';
import { AlertDetailsSource } from '../types';
import { TopAlert } from '../../..';
import { Groups } from '../../../components/alert_sources/groups';
import { getSources } from '../../../components/alert_sources/get_sources';

export interface SourceBarProps {
  alert: TopAlert;
  sources?: AlertDetailsSource[];
}

export function SourceBar({ alert, sources = [] }: SourceBarProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const groups = getSources(alert);

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  return (
    groups &&
    groups.length > 0 && (
      <EuiPanel data-test-subj="alert-summary-container" hasShadow={false} hasBorder={true}>
        <EuiFlexGroup gutterSize="l" direction="row" wrap>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.observability.alertDetails.sourceBar.source"
                defaultMessage="Source"
              />
            </h5>
          </EuiTitle>
          <Groups groups={groups} timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }} />
          {sources.map((field, idx) => {
            return (
              <EuiFlexItem key={`sources-${idx}`} grow={false}>
                <EuiText>
                  {field.label}: {field.value}
                </EuiText>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiPanel>
    )
  );
}

// eslint-disable-next-line import/no-default-export
export default SourceBar;
