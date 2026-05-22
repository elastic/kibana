/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { CloudLinksPillStyle } from './cloud_links_styles';

interface CloudLink {
  id: string;
  label: string;
  href: string;
}

export const CloudLinks = () => {
  const {
    services: { cloud },
  } = useKibana();

  const [billingUrl, setBillingUrl] = useState<string>('');
  const [isLoadingPrivilegedUrls, setIsLoadingPrivilegedUrls] = useState(true);
  useEffect(() => {
    cloud
      ?.getPrivilegedUrls()
      .then((urls) => {
        if (urls.billingUrl) {
          setBillingUrl(urls.billingUrl);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingPrivilegedUrls(false));
  }, [cloud]);

  const cloudLinks = useMemo(() => {
    const links: CloudLink[] = [];

    if (cloud?.baseUrl) {
      links.push({
        id: 'elasticCloud',
        label: i18n.translate('xpack.searchHomepage.cloudLinks.elasticCloud', {
          defaultMessage: 'Elastic Cloud',
        }),
        href: cloud.baseUrl,
      });
    }

    if (billingUrl) {
      links.push({
        id: 'usage',
        label: i18n.translate('xpack.searchHomepage.cloudLinks.usage', {
          defaultMessage: 'Usage',
        }),
        href: billingUrl,
      });
    }

    if (cloud?.organizationUrl) {
      links.push({
        id: 'organization',
        label: i18n.translate('xpack.searchHomepage.cloudLinks.organization', {
          defaultMessage: 'Organization',
        }),
        href: cloud.organizationUrl,
      });
    }

    return links;
  }, [cloud, billingUrl]);

  if (!cloud?.isCloudEnabled || !cloud?.baseUrl) {
    return null;
  }

  if (isLoadingPrivilegedUrls) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" css={CloudLinksPillStyle}>
      <EuiFlexItem grow={false}>
        <EuiLink
          href={cloud.baseUrl}
          target="_blank"
          external={false}
          aria-label={i18n.translate('xpack.searchHomepage.cloudLinks.homeAriaLabel', {
            defaultMessage: 'Elastic Cloud home',
          })}
          data-test-subj="searchHomepageCloudLink-home"
        >
          <EuiIcon type="logoCloud" size="m" aria-hidden={true} />
        </EuiLink>
      </EuiFlexItem>
      {cloudLinks.map((link) => (
        <EuiFlexItem grow={false} key={link.id}>
          <EuiLink
            href={link.href}
            target="_blank"
            external={false}
            data-test-subj={`searchHomepageCloudLink-${link.id}`}
          >
            {link.label}
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
