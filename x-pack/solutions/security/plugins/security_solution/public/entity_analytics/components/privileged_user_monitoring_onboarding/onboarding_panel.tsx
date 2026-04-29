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
    <EuiPanel paddingSize="none" data-test-subj="privilegedUserMonitoringOnboardingPanel">
      <EuiPanel paddingSize="xl" color="subdued" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          gutterSize="xl"
          alignItems="center"
        >
          <EuiFlexItem grow={4}>
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder={false} color="subdued">
              <EuiFlexGroup justifyContent="spaceBetween" direction="column">
                <EuiFlexGroup gutterSize="m" alignItems="baseline">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <h2>
                        <FormattedMessage
                          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageTitle"
                          defaultMessage="Privileged user monitoring"
                        />
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageDescription"
                      defaultMessage="Gain visibility into privileged user activity to analyze account usage, track access events, and spot potential risks. By continuously monitoring high-risk users and identifying anomalous privileged behaviors, you can detect potential threats, such as unauthorized access or lateral movement, before they escalate."
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
          <EuiFlexItem grow={3}>
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
