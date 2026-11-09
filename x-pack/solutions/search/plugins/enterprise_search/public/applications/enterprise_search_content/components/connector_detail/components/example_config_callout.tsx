/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { KbnWarningCallout } from '@kbn/ui-callout';

export const ExampleConfigCallout: React.FC = () => (
  <>
    <KbnWarningCallout
      title={i18n.translate(
        'xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.title',
        {
          defaultMessage: 'Example connector',
        }
      )}
      text={
        <FormattedMessage
          id="xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.description"
          defaultMessage="This is an example connector that serves as a building block for customizations. The design and code is being provided as-is with no warranties. This is not subject to the SLA of supported features."
        />
      }
    />
    <EuiSpacer />
  </>
);
