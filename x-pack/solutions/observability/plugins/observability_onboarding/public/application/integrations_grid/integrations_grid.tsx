/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IntegrationsCategory } from './integrations_category';
import { IntegrationTile } from './integration_tile';
import { INTEGRATION_CATEGORIES } from './tiles_config';
import { MiniIntegrationTile } from './more_integrations_section/mini_integration_tile';
import { BrowseAllIntegrationsTile } from './more_integrations_section/browse_all_integrations_tile';
import { MINI_INTEGRATION_TILES } from './more_integrations_section/mini_tiles_config';

export const IntegrationsGrid = () => {
  const titleId = useGeneratedHtmlId({ prefix: 'integrationsGridTitle' });
  const shouldStackVertically = useIsWithinBreakpoints(['xs', 's', 'm']);

  return (
    <section aria-labelledby={titleId}>
      <EuiTitle size="s">
        <h3 id={titleId}>
          {i18n.translate('xpack.observability_onboarding.integrationsGrid.title', {
            defaultMessage: 'Integrations',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.observability_onboarding.integrationsGrid.subtitle', {
            defaultMessage:
              'Pre-built integrations for your infrastructure and services. Includes dashboards, alerts, and more.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
        <EuiFlexGroup direction="column" gutterSize="xl">
          {INTEGRATION_CATEGORIES.map((category) => (
            <EuiFlexItem key={category.id} grow={false}>
              <IntegrationsCategory id={category.id} label={category.label}>
                <EuiFlexGrid columns={3} gutterSize="m">
                  {category.tiles.map((tile) => (
                    <EuiFlexItem key={tile.id}>
                      <IntegrationTile tile={tile} />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGrid>
              </IntegrationsCategory>
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <IntegrationsCategory
              id="more-integrations"
              label={i18n.translate(
                'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.title',
                { defaultMessage: 'More integrations' }
              )}
            >
              <EuiFlexGroup direction={shouldStackVertically ? 'column' : 'row'} gutterSize="m">
                <EuiFlexItem grow={shouldStackVertically ? false : 5}>
                  <EuiFlexGroup gutterSize="m">
                    {MINI_INTEGRATION_TILES.map((tile) => (
                      <EuiFlexItem key={tile.id} grow={1}>
                        <MiniIntegrationTile tile={tile} />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={shouldStackVertically ? false : 2}>
                  <BrowseAllIntegrationsTile />
                </EuiFlexItem>
              </EuiFlexGroup>
            </IntegrationsCategory>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </section>
  );
};
