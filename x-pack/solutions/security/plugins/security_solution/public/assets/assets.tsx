/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LandingLinksIconsGroups } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName, ExternalPageName } from '@kbn/security-solution-navigation';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiCallOut, EuiPageHeader, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { useRootNavLink } from '../common/links/nav_links';

const INTEGRATIONS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.assets.integrationsCallout.title',
  { defaultMessage: 'Integrations' }
);
const INTEGRATIONS_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.assets.integrationsCallout.content',
  { defaultMessage: 'Choose an integration to start collecting and analyzing your data.' }
);
const INTEGRATIONS_CALLOUT_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.assets.integrationsCallout.buttonText',
  { defaultMessage: 'Browse integrations' }
);

export const Assets: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const link = useRootNavLink(SecurityPageName.assets);
  const { links = [], title } = link ?? {};

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={title} />
        <EuiSpacer size="l" />
        <EuiSpacer size="xl" />
        <LandingLinksIconsGroups items={links} />
        <EuiSpacer size="l" />
        <EuiSpacer size="l" />
        <EuiCallOut
          title={INTEGRATIONS_CALLOUT_TITLE}
          color="primary"
          iconType="cluster"
          style={{ borderRadius: euiTheme.border.radius.medium }}
        >
          <p>{INTEGRATIONS_CALLOUT_DESCRIPTION}</p>
          <LinkButton id={ExternalPageName.integrationsSecurity} fill>
            {INTEGRATIONS_CALLOUT_BUTTON_TEXT}
          </LinkButton>
        </EuiCallOut>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
