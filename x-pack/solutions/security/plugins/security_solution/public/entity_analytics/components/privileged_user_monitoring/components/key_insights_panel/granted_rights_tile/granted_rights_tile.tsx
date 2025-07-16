/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { getGrantedRightsEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const GrantedRightsTile: React.FC<{ spaceId: string; sourcerDataView: DataViewSpec }> = ({
  spaceId,
  sourcerDataView,
}) => {
  return (
    <KeyInsightsTile
      title={
        <FormattedMessage
          id="xpack.securitySolution.privmon.grantedRights.title"
          defaultMessage="Granted Rights"
        />
      }
      label={
        <FormattedMessage
          id="xpack.securitySolution.privmon.grantedRights.label"
          defaultMessage="Granted Rights"
        />
      }
      getEsqlQuery={(namespace) => getGrantedRightsEsqlCount(namespace, sourcerDataView)}
      id="privileged-user-monitoring-granted-rights"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.grantedRights.inspectTitle"
          defaultMessage="Granted rights"
        />
      }
    />
  );
};
