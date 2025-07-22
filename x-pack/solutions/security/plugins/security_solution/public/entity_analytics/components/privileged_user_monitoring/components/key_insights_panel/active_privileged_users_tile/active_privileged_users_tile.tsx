/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { getActivePrivilegedUsersEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const ActivePrivilegedUsersTile: React.FC<{
  spaceId: string;
  sourcerDataView: DataViewSpec;
}> = ({ spaceId, sourcerDataView }) => {
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.title', {
        defaultMessage: 'Active privileged users',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.label', {
        defaultMessage: 'Active privileged users',
      })}
      getEsqlQuery={(namespace: string) =>
        getActivePrivilegedUsersEsqlCount(namespace, sourcerDataView)
      }
      id="privileged-user-monitoring-active-users"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.activePrivilegedUsers.inspectTitle"
          defaultMessage="Active privileged users"
        />
      }
    />
  );
};
