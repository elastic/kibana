/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { getGrantedRightsEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const GrantedRightsTile: React.FC<{
  spaceId: string;
  indexPattern: string;
  fields: DataViewFieldMap;
}> = ({ spaceId, indexPattern, fields }) => {
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.grantedRights.title', {
        defaultMessage: 'Granted rights',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.grantedRights.label', {
        defaultMessage: 'Granted rights',
      })}
      getEsqlQuery={(namespace) => getGrantedRightsEsqlCount(namespace, indexPattern, fields)}
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
