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
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiAvatar,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';

export const Security: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiAvatar
          size="xl"
          color="plain"
          name="Security"
          iconType="logoSecurity"
          style={{ border: euiTheme.border.thin }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <span>
                {i18n.translate('xpack.searchHomepage.security.title', {
                  defaultMessage: 'Security',
                })}
              </span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>
                {i18n.translate('xpack.searchHomepage.security.description', {
                  defaultMessage:
                    'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
                })}
              </span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate('xpack.searchHomepage.security.detectThreatsTitle', {
                          defaultMessage: 'Detect threats in your data',
                        })}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiLink data-test-subj="setupSiemLink" href={docLinks.ingestDataToSecurity}>
                      {i18n.translate('xpack.searchHomepage.security.setupSiem', {
                        defaultMessage: 'Setup your SIEM',
                      })}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate('xpack.searchHomepage.security.secureEndpointTitle', {
                          defaultMessage: 'Secure your endpoints',
                        })}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      data-test-subj="setupElasticDefendLink"
                      href={docLinks.installElasticDefend}
                    >
                      {i18n.translate('xpack.searchHomepage.security.setupElasticDefend', {
                        defaultMessage: 'Setup Elastic Defend',
                      })}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate('xpack.searchHomepage.security.secureCloudAssetsTitle', {
                          defaultMessage: 'Secure your cloud assets',
                        })}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      data-test-subj="cloudSecurityPostureManagementLink"
                      href={docLinks.cloudSecurityPosture}
                    >
                      {i18n.translate(
                        'xpack.searchHomepage.security.cloudSecurityPostureManagementLink',
                        {
                          defaultMessage: 'Cloud Security Posture Management',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
