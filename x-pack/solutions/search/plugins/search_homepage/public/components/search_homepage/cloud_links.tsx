/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

const CLOUD_LINKS = [
  {
    id: 'organization',
    label: i18n.translate('xpack.searchHomepage.cloudLinks.organization', {
      defaultMessage: 'Organization',
    }),
    path: '/account/members',
  },
  {
    id: 'billing',
    label: i18n.translate('xpack.searchHomepage.cloudLinks.billing', {
      defaultMessage: 'Billing',
    }),
    path: '/billing/overview',
  },
  {
    id: 'usage',
    label: i18n.translate('xpack.searchHomepage.cloudLinks.usage', {
      defaultMessage: 'Usage',
    }),
    path: '/billing/usage',
  },
];

interface CloudLinksProps {
  versionBadge?: ReactNode;
}

export const CloudLinks = ({ versionBadge }: CloudLinksProps) => {
  const {
    services: { cloud },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const separatorCss = css({
    borderLeft: euiTheme.border.thin,
    height: euiTheme.size.l,
  });

  const showCloudLinks = cloud?.isCloudEnabled && cloud?.baseUrl;
  const baseUrl = cloud?.baseUrl?.replace(/\/$/, '');

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      {showCloudLinks && (
        <>
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
          <EuiFlexItem grow={false}>
            <span css={separatorCss} />
          </EuiFlexItem>
          {CLOUD_LINKS.map((link) => (
            <EuiFlexItem grow={false} key={link.id}>
              <EuiLink
                href={`${baseUrl}${link.path}`}
                target="_blank"
                external={false}
                data-test-subj={`searchHomepageCloudLink-${link.id}`}
              >
                {link.label}
              </EuiLink>
            </EuiFlexItem>
          ))}
        </>
      )}
      {versionBadge && (
        <>
          {showCloudLinks && (
            <EuiFlexItem grow={false}>
              <span css={separatorCss} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>{versionBadge}</EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
