/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiIcon,
  EuiLink,
  EuiBetaBadge,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddDataSourcePanel } from './components/add_data_source';
import privilegedUserMonitoringOnboardingPageIllustration from '../../../common/images/information_light.png';
import { useKibana } from '../../../common/lib/kibana';

interface PrivilegedUserMonitoringOnboardingPanelProps {
  onComplete: (userCount: number) => void;
}

export const PrivilegedUserMonitoringOnboardingPanel = ({
  onComplete,
}: PrivilegedUserMonitoringOnboardingPanelProps) => {
  const { docLinks } = useKibana().services;

  return (
    <EuiPanel paddingSize="none">
      <EuiPanel paddingSize="xl" color="subdued" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          gutterSize="xl"
          alignItems="center"
        >
          <EuiFlexItem grow={1}>
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder={false} color="subdued">
              <EuiFlexGroup justifyContent="spaceBetween" direction="column">
                <EuiFlexGroup gutterSize={'m'} alignItems={'center'}>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageTitle"
                        defaultMessage="Privileged user monitoring"
                      />
                    </h2>
                  </EuiTitle>
                  <EuiBetaBadge
                    size={'m'}
                    label={i18n.translate(
                      'xpack.securitySolution.privilegedUserMonitoring.onboarding.betaStatus',
                      { defaultMessage: 'TECHNICAL PREVIEW' }
                    )}
                  />
                </EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageDescription"
                      defaultMessage="Privileged user monitoring provides visibility into privileged user
                    activity, helping security teams analyze account usage, track access events, and
                    spot potential risks. By continuously monitoring high-risk users and detecting anomalous
                    privileged behaviors, the dashboard enables early detection of potential threats,
                    such as unauthorized access or lateral movement, before they escalate."
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="s">
                    <EuiFlexGroup
                      alignItems="center"
                      justifyContent="flexStart"
                      gutterSize="s"
                      responsive={false}
                    >
                      <EuiIcon type="documentation" size="m" />
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.learnMore.label"
                        defaultMessage="Want to learn more?"
                      />
                      <EuiLink
                        external={true}
                        data-test-subj="learnMoreLink"
                        href={
                          docLinks?.links.securitySolution.entityAnalytics.privilegedUserMonitoring
                        }
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.docLink.description"
                          defaultMessage="Check our documentation"
                        />
                      </EuiLink>
                    </EuiFlexGroup>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiImage
              src={privilegedUserMonitoringOnboardingPageIllustration}
              hasShadow={false}
              alt={i18n.translate(
                'xpack.securitySolution.privilegedUserMonitoring.onboarding.dashboardIllustrationAltText',
                { defaultMessage: 'Privileged user monitoring dashboard illustration' }
              )}
              size="l"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <AddDataSourcePanel onComplete={onComplete} />
    </EuiPanel>
  );
};
