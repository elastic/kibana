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
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiImage,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ApiKeyForm } from '@kbn/workplaceai-api-keys-components';
import { useCurrentUser } from '../hooks/use_current_user';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import headerHeroSvg from '../../assets/header_hero.svg';
import mcpEndpointSVG from '../../assets/mcp_endpoint.svg';

export const WorkplaceAIHomeHeader: React.FC = () => {
  const user = useCurrentUser();
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xl">
      <EuiFlexItem grow={7}>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.workplaceai.gettingStarted.homeHeader.welcomeTitle"
              defaultMessage="Welcome, {name}"
              values={{ name: user?.full_name || user?.username || 'User' }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="m">
          <p>
            <FormattedMessage
              id="xpack.workplaceai.gettingStarted.homeHeader.description"
              defaultMessage="Connect data, create agents, and automate workflows powered by your enterprise knowledge."
            />
          </p>
        </EuiText>
        <EuiSpacer size="xxl" />

        {/* Configuration Buttons Row */}
        <EuiFlexGroup gutterSize="s" wrap>
          <EuiFlexItem grow={false} justifyContent="center">
            <EuiCodeBlock isCopyable paddingSize="none" fontSize="m">
              {elasticsearchUrl}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ApiKeyForm hasTitle={false} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              color="text"
              size="s"
              iconType={mcpEndpointSVG}
              iconSide="left"
              onClick={() => {}}
            >
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.homeHeader.mcpEndpointButtonLabel"
                defaultMessage="MCP Endpoint"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              color="text"
              size="s"
              iconType="gear"
              iconSide="left"
              onClick={() => {}}
            >
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.homeHeader.connectionSettingsButtonLabel"
                defaultMessage="Connection settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Hero Illustration */}
      <EuiFlexItem grow={3}>
        <EuiImage
          src={headerHeroSvg}
          alt={i18n.translate('xpack.workplaceai.gettingStarted.homeHeader.heroImageAlt', {
            defaultMessage: 'Workplace AI Hero',
          })}
          size="l"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
