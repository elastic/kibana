/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getPrivilegedMonitorUsersIndex } from '../../../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import { createKeyInsightsPanelFormBasedLensAttributes } from '../common/lens_attributes';
import { getPrivilegedUsersDslFilter } from './privileged_user_count_filter';
import { KeyInsightsTile } from '../common/key_insights_tile';


export const PrivilegedUsersTile: React.FC<{
  spaceId: string;
}> = ({ spaceId }) => {
  const title = i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.title', {
    defaultMessage: 'Privileged users',
  });
  const label = i18n.translate('xpack.securitySolution.privmon.activePrivilegedUsers.label', {
    defaultMessage: 'Privileged users',
  });

  return (
    <KeyInsightsTile
      title={title}
      label={label}
      getLensAttributes={(namespace: string) => {
        const dataViewId = `privileged-users-${namespace}`;
        const dataViewTitle = getPrivilegedMonitorUsersIndex(namespace);

        return createKeyInsightsPanelFormBasedLensAttributes({
          title,
          label,
          dataViewId,
          dataViewTitle,
          filters: [getPrivilegedUsersDslFilter(dataViewId)],
        });
      }}
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
