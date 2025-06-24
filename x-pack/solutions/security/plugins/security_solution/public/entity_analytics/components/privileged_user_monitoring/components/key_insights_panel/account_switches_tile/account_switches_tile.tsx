/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAccountSwitchesEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const AccountSwitchesTile: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  return (
    <KeyInsightsTile
      title={
        <FormattedMessage
          id="xpack.securitySolution.privmon.accountSwitches.title"
          defaultMessage="Account Switches"
        />
      }
      label={
        <FormattedMessage
          id="xpack.securitySolution.privmon.accountSwitches.label"
          defaultMessage="Account Switches"
        />
      }
      getEsqlQuery={getAccountSwitchesEsqlCount}
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
