/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ConnectorLinked: React.FC = () => {
  return (
    <EuiCallOut
      color="success"
      title={i18n.translate(
        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.connectorLinked.callout.title',
        {
          defaultMessage: 'Connector connected',
        }
      )}
      iconType="check"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.connectorLinked.callout.description',
        {
          defaultMessage: 'Congratulations. Looks like your connector is deployed and connected.',
        }
      )}
    </EuiCallOut>
  );
};
