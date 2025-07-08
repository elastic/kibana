/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize, isArray } from 'lodash/fp';
import { EuiBadge, EuiButtonIcon, type EuiBasicTableColumn } from '@elastic/eui';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { UserName } from '../../../user_name';
import { getRowItemsWithActions } from '../../../../../common/components/tables/helpers';
import { NetworkDetails } from '../../../network_details';
import type { TableItemType } from './types';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { SCOPE_ID } from '../../constants';

const COLUMN_WIDTHS = { actions: '5%', '@timestamp': '20%', privileged_user: '15%' };

const timestampColumn: EuiBasicTableColumn<TableItemType> = {
  field: '@timestamp',
  truncateText: true,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.timestamp"
      defaultMessage="Timestamp"
    />
  ),
  width: COLUMN_WIDTHS['@timestamp'],
  dataType: 'date',
  render: (timestamp?: string) => {
    if (!timestamp) {
      return getEmptyTagValue();
    }

    return <PreferenceFormattedDate value={new Date(timestamp)} />;
  },
};

const getPrivilegedUserColumn = (fieldName: string) => ({
  field: 'privileged_user',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.privilegedUser"
      defaultMessage="Privileged user"
    />
  ),
  width: COLUMN_WIDTHS.privileged_user,
  render: (user: string[] | string) =>
    user != null
      ? getRowItemsWithActions({
          values: isArray(user) ? user : [user],
          // TODO We need a way to filter by several field with an OR expression
          // because the ESQL queries several source indices that have different field names
          // Issue to extend SecurityCellActions to support this: https://github.com/elastic/security-team/issues/12712
          fieldName,
          idPrefix: 'privileged-user-monitoring-privileged-user',
          render: (item) => <UserName userName={item} scopeId={SCOPE_ID} />,
          displayCount: 1,
        })
      : getEmptyTagValue(),
});

const getTargetUserColumn = (fieldName: string) => ({
  field: 'target_user',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.targetUser"
      defaultMessage="Target user"
    />
  ),
  render: (user: string[] | string) =>
    user != null
      ? getRowItemsWithActions({
          values: isArray(user) ? user : [user],
          fieldName,
          idPrefix: 'privileged-user-monitoring-target-user',
          render: (item) => <UserName userName={item} scopeId={SCOPE_ID} />,
          displayCount: 1,
        })
      : getEmptyTagValue(),
});

const getIpColumn = (fieldName = 'source.ip') => ({
  field: 'host_ip',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.sourceIp"
      defaultMessage="Source IP"
    />
  ),
  render: (ips: string[] | string) =>
    ips != null
      ? getRowItemsWithActions({
          values: isArray(ips) ? ips : [ips],
          fieldName,
          idPrefix: 'privileged-user-monitoring-ip',
          render: (item) => <NetworkDetails ip={item} />,
          displayCount: 1,
        })
      : getEmptyTagValue(),
});

const getActionsColumn = (openRightPanel: (props: FlyoutPanelProps) => void) => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.actions"
      defaultMessage="Actions"
    />
  ),
  render: (record: { _id: string; _index: string }) => {
    const onClick = () => {
      openRightPanel({
        id: DocumentDetailsRightPanelKey,
        params: {
          id: record._id,
          indexName: record._index,
          scopeId: SCOPE_ID,
        },
      });
    };

    return (
      <EuiButtonIcon
        iconType="expand"
        onClick={onClick}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.preview.ariaLabel',
          {
            defaultMessage: 'Preview event with id {id}',
            values: { id: record._id },
          }
        )}
      />
    );
  },
  width: COLUMN_WIDTHS.actions,
});

type OpenRightPanelType = (props: FlyoutPanelProps) => void;
export const buildGrantedRightsColumns = (
  openRightPanel: OpenRightPanelType
): Array<EuiBasicTableColumn<TableItemType>> => [
  getActionsColumn(openRightPanel),
  timestampColumn,
  getPrivilegedUserColumn('user.name'),
  getTargetUserColumn('user.target.name'),
  {
    field: 'group_name',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.grantedRight"
        defaultMessage="Granted right"
      />
    ),
  },
  getIpColumn('host.ip'),
];

export const buildAccountSwitchesColumns = (
  openRightPanel: OpenRightPanelType
): Array<EuiBasicTableColumn<TableItemType>> => [
  getActionsColumn(openRightPanel),
  timestampColumn,
  getPrivilegedUserColumn('process.real_user.name'),
  {
    ...getTargetUserColumn('process.group_leader.user.name'),
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.targetAccount"
        defaultMessage="Target account"
      />
    ),
  },
  {
    field: 'group_name',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.groupName"
        defaultMessage="Target admin group"
      />
    ),
  },
  {
    field: 'command_process',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.commandProcess"
        defaultMessage="Command/Process"
      />
    ),
  },
  getIpColumn('host.ip'),
];

export const buildAuthenticationsColumns = (
  openRightPanel: OpenRightPanelType
): Array<EuiBasicTableColumn<TableItemType>> => [
  getActionsColumn(openRightPanel),
  timestampColumn,
  getPrivilegedUserColumn('client.user.name'),
  {
    field: 'source',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.source"
        defaultMessage="Source"
      />
    ),
    render: (source?: string) => {
      if (!source) {
        return getEmptyTagValue();
      }

      return capitalize(source);
    },
  },
  {
    field: 'type',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.type"
        defaultMessage="Type"
      />
    ),
    render: (type?: string) => {
      if (!type) {
        return getEmptyTagValue();
      }

      return type;
    },
  },
  // TODO Add the column depending on this ticket output https://github.com/elastic/security-team/issues/12713
  // {
  //   field: 'method',
  //   name: (
  //     <FormattedMessage
  //       id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.method"
  //       defaultMessage="Method"
  //     />
  //   ),
  //   render: (method: string) => {
  //     // TODO: Implement method rendering logic
  //     return '// TODO';
  //   },
  // },
  {
    field: 'result',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.result"
        defaultMessage="Result"
      />
    ),
    render: (result: string) => {
      if (!result) {
        return getEmptyTagValue();
      }
      return <EuiBadge color={getResultColor(result)}>{capitalize(result)}</EuiBadge>;
    },
  },
  getIpColumn(),
  {
    field: 'destination',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.columns.destination"
        defaultMessage="Destination"
      />
    ),
  },
];

const getResultColor = (value: string) => {
  const valueLowerCase = value.toLocaleLowerCase();
  if (valueLowerCase === 'success') {
    return 'success';
  }
  if (valueLowerCase === 'failure') {
    return 'danger';
  }
  return 'default';
};
