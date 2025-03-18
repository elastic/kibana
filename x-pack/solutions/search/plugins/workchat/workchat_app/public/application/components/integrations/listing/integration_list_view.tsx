/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiButton } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { type Integration, IntegrationType } from '@kbn/wci-common';
import { useNavigation } from '../../../hooks/use_navigation';
import { integrationTypeToLabel } from '../utils';
interface IntegrationListViewProps {
  integrations: Integration[];
}

export const IntegrationListView: React.FC<IntegrationListViewProps> = ({ integrations }) => {
  const { navigateToWorkchatUrl } = useNavigation();
  const columns: Array<EuiBasicTableColumn<Integration>> = [
    {
      field: 'type',
      name: 'Type',
      render: (type: IntegrationType) => integrationTypeToLabel(type),
    },
    { field: 'description', name: 'Description' },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this integration',
          isPrimary: true,
          icon: 'documentEdit',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(`/integrations/${id}`);
          },
          'data-test-subj': 'integrationListTable-edit-btn',
        },
      ],
    },
  ];

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header pageTitle="Integrations" />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiButton
          onClick={() => {
            return navigateToWorkchatUrl('/integrations/create');
          }}
        >
          Create new integration
        </EuiButton>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section>
        <EuiBasicTable columns={columns} items={integrations} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
