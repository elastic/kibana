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
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ONBOARDING_VIDEO_SOURCE } from '../../../common/constants';
import { AddDataSourcePanel } from './add_data_source';

const VIDEO_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.videoTitle',
  {
    defaultMessage: 'Onboarding Video',
  }
);

export const PrivilegedUserMonitoringOnboardingPanel = () => {
  return (
    <EuiPanel paddingSize="none">
      <EuiPanel paddingSize="xl" color="subdued" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          gutterSize="xl"
          alignItems="center"
        >
          <EuiFlexItem grow={1} paddingSize="xl">
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder={false} color="subdued">
              <EuiFlexGroup justifyContent="spaceBetween" direction="column">
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageTitle"
                        defaultMessage="Privileged user monitoring"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.pageDescription"
                      defaultMessage="The Privileged user monitoring provides visibility into privileged user
                    activity, helping security teams analyze account usage, track access events, and
                    spot potential risks. By continuously monitoring high-risk accounts, the
                    dashboard enables early detection of potential threats, such as unauthorized
                    access or lateral movement, before they escalate."
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
                        css={{ color: '#FF007F' }} // TODO DELETE THIS WHEN THE HREF LINK IS READY
                        external={true}
                        data-test-subj="learnMoreLink"
                        href="??????" // TODO Add Link to docs
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
            <iframe
              css={css`
                height: auto;
                width: 100%;
                aspect-ratio: 16 / 9;
                max-width: 480px;
              `}
              className="eui-alignMiddle"
              style={{ border: '8px solid #FF007F' }} // TODO DELETE THIS LINE WHEN THE VIDEO IS READY
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
              src={ONBOARDING_VIDEO_SOURCE}
              title={VIDEO_TITLE}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <AddDataSourcePanel />
    </EuiPanel>
  );
};
