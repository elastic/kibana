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
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { docLinks } from '../../../common/doc_links';

export const Security: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const logoContainerStyle = css({
    borderRadius: euiTheme.border.radius.medium,
    padding: euiTheme.size.base,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    width: `${euiTheme.base * 6}px`,
    height: `${euiTheme.base * 6}px`,
    justifyContent: 'center',
    alignItems: 'center',
  });

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="l" data-test-subj="securitySection" >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" alignItems="flexStart">
          <EuiFlexItem css={logoContainerStyle} grow={false}>
            <EuiIcon size="xxl" type="logoSecurity" name="Security" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.searchHomepage.security.title', {
                  defaultMessage: 'Security',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="relative" color="subdued">
              <p>
                {i18n.translate('xpack.searchHomepage.security.description', {
                  defaultMessage:
                    'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiLink data-test-subj="setupElasticDefendLink" href={docLinks.installElasticDefend}>
              {i18n.translate('xpack.searchHomepage.security.setupElasticDefend', {
                defaultMessage: 'Set up Elastic Defend',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
