/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const CloudLinks = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  if (!cloud?.isCloudEnabled || !cloud?.baseUrl) {
    return null;
  }

  const baseUrl = cloud.baseUrl.replace(/\/$/, '');

  const cloudLinks = [
    {
      id: 'elasticCloud',
      label: i18n.translate('xpack.searchHomepage.cloudLinks.elasticCloud', {
        defaultMessage: 'Elastic Cloud',
      }),
      path: '/home',
    },
    {
      id: 'usage',
      label: i18n.translate('xpack.searchHomepage.cloudLinks.usage', {
        defaultMessage: 'Usage',
      }),
      path: '/billing/usage',
    },
    {
      id: 'organization',
      label: i18n.translate('xpack.searchHomepage.cloudLinks.organization', {
        defaultMessage: 'Organization',
      }),
      path: '/account/members',
    },
  ];

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      css={css`
        background: ${euiTheme.colors.backgroundBasePrimary};
        border-radius: ${euiTheme.size.m};
        height: 24px;
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiLink
          href={`${baseUrl}/home`}
          target="_blank"
          external={false}
          data-test-subj="searchHomepageCloudLink-home"
        >
          <EuiIcon type="logoCloud" size="m" aria-hidden={true} />
        </EuiLink>
      </EuiFlexItem>
      {cloudLinks.map((link) => (
        <EuiFlexItem grow={false} key={link.id}>
          <EuiLink
            href={`${baseUrl}${link.path}`}
            target="_blank"
            external={false}
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
            data-test-subj={`searchHomepageCloudLink-${link.id}`}
          >
            {link.label}
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
