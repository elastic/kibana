/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SLOS_MANAGEMENT_PATH,
  SLOS_MANAGEMENT_TEMPLATES_PATH,
} from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { ActionModalProvider } from '../../../context/action_modal';
import { SloOutdatedFilterCallout } from './slo_definitions/slo_management_outdated_filter_callout';
import { SloManagementTable } from './slo_definitions/slo_management_table';
import { SloTemplatesTable } from './slo_templates/slo_templates_table';
import { BulkOperationProvider } from '../context/bulk_operation';
import { useTemplatesUrlSearchState } from '../hooks/use_templates_url_search_state';

export type ManagementTab = 'definitions' | 'templates';

export function useActiveManagementTab(): ManagementTab {
  const history = useHistory();
  return history.location.pathname === SLOS_MANAGEMENT_TEMPLATES_PATH ? 'templates' : 'definitions';
}

export function SloManagementTabs() {
  const history = useHistory();
  const activeTab = useActiveManagementTab();
  const templatesSearchState = useTemplatesUrlSearchState();

  const onTabChange = (tab: ManagementTab) => {
    if (tab === 'templates') {
      history.push(SLOS_MANAGEMENT_TEMPLATES_PATH);
    } else {
      history.push(SLOS_MANAGEMENT_PATH);
    }
  };

  return (
    <>
      <EuiTabs>
        <EuiTab
          isSelected={activeTab === 'definitions'}
          onClick={() => onTabChange('definitions')}
          data-test-subj="managementTabDefinitions"
        >
          {i18n.translate('xpack.slo.managementPage.tab.definitions', {
            defaultMessage: 'SLO Definitions',
          })}
        </EuiTab>
        <EuiTab
          isSelected={activeTab === 'templates'}
          onClick={() => onTabChange('templates')}
          data-test-subj="managementTabTemplates"
        >
          {i18n.translate('xpack.slo.managementPage.tab.templates', {
            defaultMessage: 'SLO Templates',
          })}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {activeTab === 'definitions' && (
        <BulkOperationProvider>
          <ActionModalProvider>
            <EuiFlexGroup direction="column" gutterSize="m">
              <SloOutdatedFilterCallout />
              <SloManagementTable />
            </EuiFlexGroup>
          </ActionModalProvider>
        </BulkOperationProvider>
      )}
      {activeTab === 'templates' && (
        <SloTemplatesTable
          state={templatesSearchState.state}
          onStateChange={templatesSearchState.onStateChange}
        />
      )}
    </>
  );
}
