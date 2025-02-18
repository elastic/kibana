/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const SyncScheduledCallOut: React.FC = () => {
  return (
    <EuiCallOut
      color="primary"
      iconType="iInCircle"
      title={i18n.translate('xpack.serverlessSearch.connectors.syncScheduledTitle', {
        defaultMessage: 'A sync has been scheduled',
      })}
    >
      <EuiText>
        {i18n.translate('xpack.serverlessSearch.connectors.syncSheduledDescription', {
          defaultMessage:
            'It may take a minute for this sync to be visible and for the connector to pick it up',
        })}
      </EuiText>
    </EuiCallOut>
  );
};
