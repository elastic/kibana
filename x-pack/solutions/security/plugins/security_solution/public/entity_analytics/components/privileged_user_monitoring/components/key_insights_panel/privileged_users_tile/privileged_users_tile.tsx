/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { right } from 'fp-ts/Either';
import { getPrivilegedUsersEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const PrivilegedUsersTile: React.FC<{
  spaceId: string;
}> = ({ spaceId }) => {
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.title', {
        defaultMessage: 'Privileged users',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.label', {
        defaultMessage: 'Privileged users',
      })}
      getEsqlQuery={(namespace: string) => right(getPrivilegedUsersEsqlCount(namespace))}
      id="privileged-user-monitoring-active-users"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.privilegedUsers.inspectTitle"
          defaultMessage="Privileged users"
        />
      }
    />
  );
};
