/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { MetricPanels } from './metric_panels';
import { CloudResources } from './cloud_resources';
import { BodyLinks } from './body_links';
import { useAuthenticatedUser } from '../../hooks/use_authenticated_user';
import { useKibana } from '../../hooks/use_kibana';
import { GettingStartedBanner } from './getting_started_banner';

export const SearchHomepageBody = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { isAdmin } = useAuthenticatedUser();
  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={true} grow paddingSize="none">
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <MetricPanels />
        </EuiFlexItem>
        {cloud?.isServerlessEnabled && !isAdmin ? null : (
          <EuiFlexItem>
            <EuiSpacer size="l" />
            <CloudResources />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <GettingStartedBanner />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="xxl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <BodyLinks />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
