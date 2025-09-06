/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';

export const UserLimitCallOut: React.FC = () => {
  const { config } = useKibana().services;

  const maxPrivilegedUsersAllowed =
    config?.entityAnalytics?.monitoring?.privileges?.users?.maxPrivilegedUsersAllowed ?? 10000;

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.title"
          defaultMessage="User limit information"
        />
      }
      color="primary"
      iconType="info"
    >
      <p>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.description"
          defaultMessage="Maximum number of privileged users allowed: {maxUsers}"
          values={{
            maxUsers: <strong>{maxPrivilegedUsersAllowed}</strong>,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
