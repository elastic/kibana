/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiImage,
  EuiTitle,
  EuiText,
  useEuiTheme,
  EuiSplitPanel,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';

interface ResourceCardProps {
  title: string;
  icon: (assetBasePath: string) => string;
  description: string;
  actionHref: string;
  actionText: string;
}

const CLOUD_RESOURCE_CARDS = [
  {
    icon: (assetBasePath: string) => `${assetBasePath}/search_value_calc.svg`,
    title: i18n.translate('xpack.searchHomepage.cloudResources.billing.title', {
      defaultMessage: 'Cloud Billing and Usage',
    }),
    description: i18n.translate('xpack.searchHomepage.cloudResources.billing.description', {
      defaultMessage:
        'Get a detailed breakdown of your organization’s cloud resource usage across your deployments.',
    }),
    actionText: i18n.translate('xpack.searchHomepage.cloudResources.billing.actionText', {
      defaultMessage: 'Go to Billing',
    }),
    type: 'billing' as const,
  },
  {
    icon: (assetBasePath: string) => `${assetBasePath}/search_analytics.svg`,
    title: i18n.translate('xpack.searchHomepage.cloudResources.autoops.title', {
      defaultMessage: 'Cluster performance insights',
    }),
    description: i18n.translate('xpack.searchHomepage.cloudResources.autoops.description', {
      defaultMessage:
        'Enable AutoOps for performance recommendations, resource utilization, and cost insights.',
    }),
    actionText: i18n.translate('xpack.searchHomepage.cloudResources.autoops.actionText', {
      defaultMessage: 'AutoOps',
    }),
    type: 'autoops' as const,
  },
];

const ResourceCard = ({ title, icon, description, actionHref, actionText }: ResourceCardProps) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer
      direction="row"
      css={css({
        maxWidth: euiTheme.base * 36,
      })}
    >
      <EuiSplitPanel.Inner
        paddingSize="none"
        css={css({
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        })}
      >
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <div css={css({ margin: `${euiTheme.size.xxl} 0` })}>
              <EuiImage size={96} src={icon(assetBasePath)} alt="" />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiFlexItem grow={5}>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
          <EuiSpacer size="xs" />

          <div>
            <EuiButtonEmpty
              iconSide="left"
              iconType="sortRight"
              color="text"
              data-test-subj="searchHomepageSearchHomepageBodyEnableElasticInferenceServiceButton"
              href={actionHref}
              target="_blank"
            >
              {actionText}
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

export const CloudResources = () => {
  const {
    services: { cloud },
  } = useKibana();
  const [billingUrl, setBillingUrl] = useState<string>('');
  useEffect(() => {
    cloud?.getPrivilegedUrls().then((urls) => {
      if (urls.billingUrl) {
        setBillingUrl(urls.billingUrl);
      }
    });
  }, [cloud]);
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h6>
            {i18n.translate('xpack.searchHomepage.cloudResources.h6.cloudResourcesLabel', {
              defaultMessage: 'Cloud resources',
            })}
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          {CLOUD_RESOURCE_CARDS.map((card, index) => (
            <EuiFlexItem key={`resource-${index}`}>
              <ResourceCard
                title={card.title}
                icon={card.icon}
                description={card.description}
                actionHref={card.type === 'billing' ? billingUrl : ''}
                actionText={card.actionText}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
