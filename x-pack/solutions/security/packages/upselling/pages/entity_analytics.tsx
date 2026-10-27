/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer } from '@elastic/eui';

import styled from '@emotion/styled';

import { AppHeader } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import * as i18n from './translations';
import paywallPng from '../images/entity_paywall.png';
import { EntityAnalyticsUpsellingSection } from '../sections/entity_analytics';
import type { UpsellingPageProps } from '../service/types';

const PaywallDiv = styled.div`
  max-width: 75%;
  margin: 0 auto;
  .euiCard__betaBadgeWrapper {
    .euiCard__betaBadge {
      width: auto;
    }
  }
  .paywallCardDescription {
    padding: 0 15%;
  }
`;

const EntityAnalyticsUpsellingComponent = ({
  appHeader: Header = AppHeader,
  docLink,
  upgradeMessage,
  upgradeHref,
  upgradeToLabel,
}: UpsellingPageProps & {
  docLink?: string;
  upgradeMessage: string;
  upgradeToLabel: string;
  upgradeHref?: string;
}) => {
  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <Header title={i18n.ENTITY_ANALYTICS_TITLE} docLink={docLink} spacing="largeBleed" />
        <EuiSpacer size="xl" />
        <PaywallDiv>
          <EntityAnalyticsUpsellingSection
            upgradeMessage={upgradeMessage}
            upgradeHref={upgradeHref}
            upgradeToLabel={upgradeToLabel}
          />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiImage alt={upgradeMessage} src={paywallPng} size="fullWidth" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </PaywallDiv>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

EntityAnalyticsUpsellingComponent.displayName = 'EntityAnalyticsUpsellingComponent';

export const EntityAnalyticsUpsellingPage = React.memo(EntityAnalyticsUpsellingComponent);
