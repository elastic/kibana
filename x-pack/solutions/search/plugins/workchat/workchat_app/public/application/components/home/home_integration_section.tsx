/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Integration } from '../../../../common/integrations';
import { useNavigation } from '../../hooks/use_navigation';
import { useIntegrationList } from '../../hooks/use_integration_list';
import { useCapabilities } from '../../hooks/use_capabilities';
import { appPaths } from '../../app_paths';

export const HomeIntegrationSection: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { integrations } = useIntegrationList();
  const { showManagement } = useCapabilities();

  const columns: Array<EuiBasicTableColumn<Integration>> = [
    {
      field: 'name',
      name: 'Name',
    },
    {
      field: 'type',
      name: 'Type',
    },
    {
      field: 'description',
      name: 'Description',
    },
  ];

  return (
    <KibanaPageTemplate.Section>
      <EuiTitle size="s">
        <h4>Your integrations</h4>
      </EuiTitle>
      <EuiSpacer />
      <EuiBasicTable columns={columns} items={integrations} />
      <EuiSpacer />
      {showManagement && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                navigateToWorkchatUrl(appPaths.integrations.list);
              }}
            >
              Go to integration management
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </KibanaPageTemplate.Section>
  );
};
