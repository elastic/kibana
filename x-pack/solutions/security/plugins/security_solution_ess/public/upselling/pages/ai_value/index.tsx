/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { UpgradeActions } from '../attack_discovery/upgrade_actions';
import * as i18n from './translations';

const AIValueUpsellingPageESSComponent: React.FC = () => {
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

  const title = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantBeacon backgroundColor="emptyShade" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <span>{i18n.UPGRADE_CTA}</span>
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

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader bottomBorder pageTitle={i18n.PAGE_TITLE} />
        <EuiSpacer size="xxl" />
        <EuiEmptyPrompt title={title} body={body} actions={actions} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

AIValueUpsellingPageESSComponent.displayName = 'AIValueUpsellingPageESS';

export const AIValueUpsellingPageESS = React.memo(AIValueUpsellingPageESSComponent);
