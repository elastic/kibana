/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PERMISSION_DENIED } from '../../../detection_engine/rule_response_actions/osquery/translations';

interface ResponseActionsEmptyPromptProps {
  type: 'endpoint';
}

export const ResponseActionsEmptyPrompt = ({ type }: ResponseActionsEmptyPromptProps) => {
  const integration = useMemo(() => {
    switch (type) {
      case 'endpoint':
        return {
          icon: 'logoSecurity',
          name: 'Elastic Defend',
        };
    }
  }, [type]);

  return (
    <EuiEmptyPrompt
      iconType={integration.icon}
      title={<h2>{PERMISSION_DENIED}</h2>}
      titleSize="xs"
      body={
        <FormattedMessage
          id="xpack.securitySolution.responseActions.results.missingPrivileges"
          defaultMessage="To access these results, ask your administrator for {integration} Kibana
              privileges."
          values={{
            integration: <EuiCode>{integration.name}</EuiCode>,
          }}
        />
      }
    />
  );
};
