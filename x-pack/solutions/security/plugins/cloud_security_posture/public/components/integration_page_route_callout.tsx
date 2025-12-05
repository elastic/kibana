/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { LOCAL_STORAGE_INTEGRATIONS_PAGE_ROUTE_CALLOUT_KEY } from '../../common/constants';
import { useAddIntegrationRoute } from '../common/api/use_add_integrations_route';

const INTEGRATION_CALLOUT_TITLE_MISCONFIGURATION = i18n.translate(
  'xpack.csp.findings.integrationCalloutMisconfiguration.title',
  {
    defaultMessage:
      'Ingest misconfiguration data to help you analyze, hunt, and investigate threats by providing contextual insights across your infrastructure',
  }
);

const INTEGRATION_CALLOUT_TITLE_VULNERABILITY = i18n.translate(
  'xpack.csp.findings.integrationCalloutVulnerability.title',
  {
    defaultMessage:
      'Ingest data from your existing vulnerability solutions for centralized analytics, hunting, investigations, visualizations, and contextual insights across your entire infrastructure',
  }
);

interface IntegrationPageRouteCalloutProps {
  workflowName: 'misconfiguration_workflow' | 'vulnerability_workflow';
}

export const IntegrationPageRouteCallout = ({ workflowName }: IntegrationPageRouteCalloutProps) => {
  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    LOCAL_STORAGE_INTEGRATIONS_PAGE_ROUTE_CALLOUT_KEY + workflowName
  );
  const addIntegrationRouteLink = useAddIntegrationRoute(workflowName);

  if (userHasDismissedCallout) return null;

  return (
    <EuiCallOut
      title={
        workflowName === 'misconfiguration_workflow'
          ? INTEGRATION_CALLOUT_TITLE_MISCONFIGURATION
          : INTEGRATION_CALLOUT_TITLE_VULNERABILITY
      }
      iconType="cheer"
      onDismiss={() => setUserHasDismissedCallout(true)}
    >
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButton href={addIntegrationRouteLink} target="_blank" color="primary">
            {i18n.translate('xpack.csp.findings.3pIntegrationsCallout.addIntegrationButton', {
              defaultMessage: 'Add Integration',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
