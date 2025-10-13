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
import { getAccountSwitchesEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const AccountSwitchesTile: React.FC<{ spaceId: string; dataViewSpec: DataViewSpec }> = ({
  spaceId,
  dataViewSpec,
}) => {
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.accountSwitches.title', {
        defaultMessage: 'Account switches',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.accountSwitches.label', {
        defaultMessage: 'Account switches',
      })}
      getEsqlQuery={(namespace) => getAccountSwitchesEsqlCount(namespace, dataViewSpec)}
      id="privileged-user-monitoring-account-switches"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.accountSwitches.inspectTitle"
          defaultMessage="Account switches"
        />
      }
    />
  );
};
