/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { UpgradeActions } from '../attack_discovery/upgrade_actions';
import * as i18n from './translations';

/**
 * Self-managed upsell page shown when the alert analysis workflow (an Enterprise feature) is
 * accessed on a lower license. The link is also hidden from the nav and global search by the
 * `licenseType: 'enterprise'` gate on its app link; `SecurityRoutePageWrapper` renders this page
 * when a user force-loads the URL.
 */
const AlertAnalysisWorkflowUpsellingPageESSComponent: React.FC = () => {
  const title = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <AiIcon iconType="sparkles" size="xl" aria-hidden="true" />
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{i18n.PAGE_TITLE}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const body = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="availabilityMessage">
            {i18n.AVAILABILITY_MESSAGE}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="upgradeMessage">
            {i18n.UPGRADE_MESSAGE}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const actions = useMemo(
    () => (
      <EuiFlexGroup justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <UpgradeActions />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiEmptyPrompt
          data-test-subj="alertAnalysisWorkflowUpsellingPage"
          title={title}
          body={body}
          actions={actions}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

AlertAnalysisWorkflowUpsellingPageESSComponent.displayName =
  'AlertAnalysisWorkflowUpsellingPageESS';

export const AlertAnalysisWorkflowUpsellingPageESS = React.memo(
  AlertAnalysisWorkflowUpsellingPageESSComponent
);
