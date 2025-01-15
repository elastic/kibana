/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { StatusFilter } from '../../overview/monitor_list/status_filter';
import { FilterGroup } from '../../overview/filter_group/filter_group';

export const PingListHeader = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h4>
            <FormattedMessage
              id="xpack.uptime.pingList.checkHistoryTitle"
              defaultMessage="History"
            />
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatusFilter />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ maxWidth: '135px' }}>
        <FilterGroup />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
