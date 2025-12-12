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
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export const CloudServerlessPromo = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();

  return (
    <EuiFlexGroup gutterSize="xl" direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
      <EuiFlexItem>
        <PromoItem promoItem="hosted" />
      </EuiFlexItem>
      <EuiFlexItem>
        <PromoItem promoItem="serverless" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PROMO_ITEMS = {
  serverless: {
    logoPath: (assetBasePath: string) => `${assetBasePath}/search_serverless_promo_logo.svg`,
    logoAltText: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.serverlessLogoAltText', {
      defaultMessage: 'Elasticsearch Serverless logo',
    }),
    promoTitle: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.serverlessTitle', {
      defaultMessage: 'Elasticsearch Serverless',
    }),
    description: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.serverlessDescription', {
      defaultMessage:
        'A fully managed service providing the easiest way to start and scale. With Serverless, Elastic handles all the behind-the-scenes operations like version upgrades, sharding, and scaling.',
    }),
    externalLink: 'https://www.elastic.co/cloud/serverless',
  },
  hosted: {
    logoPath: (assetBasePath: string) => `${assetBasePath}/search_hosted_promo_logo.svg`,
    logoAltText: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.hostedLogoAltText', {
      defaultMessage: 'Elasticsearch Cloud Hosted logo',
    }),
    promoTitle: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.hostedTitle', {
      defaultMessage: 'Elasticsearch Cloud Hosted',
    }),
    description: i18n.translate('xpack.searchHomepage.cloudServerlessPromo.hostedDescription', {
      defaultMessage:
        'Spin up, scale, upgrade, and delete your Elastic Stack products on the cloud provider and regions of your choice without having to manage each one separately. In an Elasatic Cloud Hosted deployment, everything works together.',
    }),
    externalLink: 'https://www.elastic.co/cloud',
  },
};

export const PromoItem = ({ promoItem }: { promoItem: 'serverless' | 'hosted' }) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();
  const logoStyle = css({
    minWidth: euiTheme.size.xxxxl,
    minHeight: euiTheme.size.xxxxl,
    width: euiTheme.size.xxxxl,
    height: euiTheme.size.xxxxl,
  });
  const logoContainerStyle = css({
    borderRadius: euiTheme.border.radius.medium,
    padding: euiTheme.size.base,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    width: `${euiTheme.base * 6}px`,
    height: `${euiTheme.base * 6}px`,
    justifyContent: 'center',
    alignItems: 'center',
  });
  const { logoPath, logoAltText, promoTitle, description, externalLink } = PROMO_ITEMS[promoItem];

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" alignItems="flexStart">
          <EuiFlexItem css={logoContainerStyle} grow={false}>
            <EuiImage size="xs" src={logoPath(assetBasePath)} alt={logoAltText} css={logoStyle} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{promoTitle}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued" grow={false}>
              {description}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiLink
              data-test-subj={`searchHomepagePromoItemExternalLink-${promoItem}`}
              external
              href={externalLink}
              target="_blank"
            >
              {i18n.translate('xpack.searchHomepage.cloudServerlessPromo.serverlessLinkText', {
                defaultMessage: 'Sign up for Elastic Cloud',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
