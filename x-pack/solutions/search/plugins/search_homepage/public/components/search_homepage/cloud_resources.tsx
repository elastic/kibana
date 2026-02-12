/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { docLinks } from '../../../common/doc_links';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';

interface ResourceCardProps {
  title: string;
  icon: (assetBasePath: string) => string;
  description: string;
  actionHref: string;
  actionText: string;
  dataTestSubj: string;
}

const ResourceCard = ({
  title,
  icon,
  description,
  actionHref,
  actionText,
  dataTestSubj,
}: ResourceCardProps) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer
      direction="row"
      responsive={['xs', 's', 'm']}
      data-test-subj={dataTestSubj}
      css={css({ height: '100%' })}
    >
      <EuiSplitPanel.Inner paddingSize="none" color="subdued">
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={css({
            height: '100%',
            padding: `${euiTheme.size.xxl} 0`,
          })}
        >
          <EuiImage size={euiTheme.base * 5} src={icon(assetBasePath)} alt="" />
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiFlexItem grow={5}>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
          <EuiSpacer size="xs" />

          <div>
            <EuiButtonEmpty
              iconSide="left"
              iconType="sortRight"
              color="text"
              data-test-subj="searchHomepageSearchCloudResourceCardAction"
              href={actionHref}
              target="_blank"
              flush="both"
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
  const isServerless = cloud?.isServerlessEnabled;

  const [billingUrl, setBillingUrl] = useState<string>('');
  useEffect(() => {
    cloud?.getPrivilegedUrls().then((urls) => {
      if (urls.billingUrl) {
        setBillingUrl(urls.billingUrl);
      }
    });
  }, [cloud]);
  const SERVERLESS_CARDS: ResourceCardProps[] = [
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
      actionHref: billingUrl,
      dataTestSubj: 'cloudResourceCard-billing',
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
      actionHref: cloud?.performanceUrl || `https://cloud.elastic.co`,
      dataTestSubj: 'cloudResourceCard-autoops',
    },
  ];
  const HOSTED_CARDS: ResourceCardProps[] = [
    {
      icon: (assetBasePath: string) => `${assetBasePath}/search_cloud_deploy.svg`,
      title: i18n.translate('xpack.searchHomepage.cloudResources.cloudConnect.title', {
        defaultMessage: 'Cloud Connect',
      }),
      description: i18n.translate('xpack.searchHomepage.cloudResources.cloudConnect.description', {
        defaultMessage:
          'Use Elastic Cloud services like AutoOps and Elastic Inference Service in your self-managed clusters.',
      }),
      actionText: i18n.translate('xpack.searchHomepage.cloudResources.cloudConnect.actionText', {
        defaultMessage: 'Connect this cluster',
      }),
      actionHref: docLinks.cloudConnect,
      dataTestSubj: 'cloudResourceCard-cloudConnect',
    },
    {
      icon: (assetBasePath: string) => `${assetBasePath}/search_serverless.svg`,
      title: i18n.translate('xpack.searchHomepage.cloudResources.elasticCloud.title', {
        defaultMessage: 'Try manage Elastic',
      }),
      description: i18n.translate('xpack.searchHomepage.cloudResources.elasticCloud.description', {
        defaultMessage:
          'Deploy, scale and upgrade your stack faster with Elastic Cloud. We’ll help you quickly move your data.',
      }),
      actionText: i18n.translate('xpack.searchHomepage.cloudResources.elasticCloud.actionText', {
        defaultMessage: 'Elastic Cloud',
      }),
      actionHref: docLinks.elasticCloud,
      dataTestSubj: 'cloudResourceCard-serverless',
    },
  ];

  const cards = isServerless ? SERVERLESS_CARDS : HOSTED_CARDS;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h6>
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.searchHomepage.cloudResources.h6.cloudResourcesLabel', {
                defaultMessage: 'Cloud resources',
              })}
            </EuiTextColor>
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          {cards.map((card, index) => (
            <EuiFlexItem key={`resource-${index}`}>
              <ResourceCard
                title={card.title}
                icon={card.icon}
                description={card.description}
                actionHref={card.actionHref}
                actionText={card.actionText}
                dataTestSubj={card.dataTestSubj}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
