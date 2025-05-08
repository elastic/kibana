/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const PRIVILEGED_USER_ACTIVITY_QUERY_ID = 'privileged-user-activity-query';
export const PAGE_SIZE = 10;

const privilegedUserOption = {
  text: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.privilegedUser"
      defaultMessage="Privileged user"
    />
  ),
  value: 'privileged_user',
};

const sourceIpOption = {
  text: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.sourceIp"
      defaultMessage="Source IP"
    />
  ),
  value: 'host_ip',
};

export const GRANTED_RIGHTS_STACK_BY = [
  privilegedUserOption,
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.targetUser"
        defaultMessage="Target user"
      />
    ),
    value: 'target_user',
  },
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.grantedRight"
        defaultMessage="Granted right"
      />
    ),
    value: 'group_name',
  },
  sourceIpOption,
];

export const ACCOUNT_SWITCH_STACK_BY = [
  privilegedUserOption,
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.targetAccount"
        defaultMessage="Target account"
      />
    ),
    value: 'target_user',
  },
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.targetAdminGroup"
        defaultMessage="Target admin group"
      />
    ),
    value: 'group_name',
  },
  sourceIpOption,
];

export const AUTHENTICATIONS_STACK_BY = [
  privilegedUserOption,
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.source"
        defaultMessage="Source"
      />
    ),
    value: 'source',
  },
  {
    text: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.stackBy.type"
        defaultMessage="Type"
      />
    ),
    value: 'type',
  },
  sourceIpOption,
];
