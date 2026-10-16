/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ConnectorDefinition } from '@kbn/search-connectors';
import { KbnInfoCallout } from '@kbn/ui-callout';

interface ResearchConfigurationProps {
  nativeConnector: ConnectorDefinition;
}
export const ResearchConfiguration: React.FC<ResearchConfigurationProps> = ({
  nativeConnector,
}) => {
  const { docsUrl, externalDocsUrl, name } = nativeConnector;

  return (
    <KbnInfoCallout
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.researchConfiguration.euiText.checkRequirementsLabel"
          defaultMessage="Check Requirements"
        />
      }
      text={
        <FormattedMessage
          id="xpack.enterpriseSearch.researchConfiguration.p.referToTheDocumentationLabel"
          defaultMessage="Refer to the documentation for this connector to learn about prerequisites for connecting to {serviceType} and configuration requirements."
          values={{
            serviceType: name,
          }}
        />
      }
      actionProps={{
        primary: {
          href: docsUrl,
          target: '_blank',
          'data-test-subj': 'enterpriseSearchResearchConfigurationDocumentationLink',
          children: i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.researchConfiguration.connectorDocumentationLinkLabel',
            {
              defaultMessage: 'Documentation',
            }
          ),
        },
        secondary: externalDocsUrl
          ? {
              href: externalDocsUrl,
              target: '_blank',
              'data-test-subj': 'enterpriseSearchResearchConfigurationNameDocumentationLink',
              children: i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.researchConfiguration.serviceDocumentationLinkLabel',
                {
                  defaultMessage: '{name} documentation',
                  values: { name },
                }
              ),
            }
          : undefined,
      }}
    />
  );
};
