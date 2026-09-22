/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AddDataSearchBar, CuratedGrid, MiniTilesRow } from '../add_data_grid';
import { BrowseAllIntegrationsTile } from './browse_all_integrations_tile';
import {
  useObservabilityCuratedCategories,
  useObservabilityMiniTiles,
} from './observability_flavor';
import { ObservabilitySearchResults } from './observability_search_results';

interface Props {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * The o11y host composition of the Add Data grid, in the current Variant B
 * layout (results replace the curated grid inside the panel).
 */
export const ObservabilityIntegrationsSection = ({ searchValue, onSearchChange }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'integrationsGridTitle' });
  const categories = useObservabilityCuratedCategories();
  const miniTiles = useObservabilityMiniTiles();
  const searchTerm = searchValue.trim();

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
        <AddDataSearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder={i18n.translate(
            'xpack.observability_onboarding.integrationsGrid.search.placeholder',
            { defaultMessage: 'Search integrations' }
          )}
          data-test-subj="observabilityOnboardingIntegrationsSearchFieldSearch"
        />
        <EuiSpacer size="l" />
        {searchTerm === '' ? (
          <CuratedGrid categories={categories}>
            <MiniTilesRow
              label={i18n.translate(
                'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.title',
                { defaultMessage: 'More integrations' }
              )}
              tiles={miniTiles}
              browseAllTile={<BrowseAllIntegrationsTile />}
            />
          </CuratedGrid>
        ) : (
          <ObservabilitySearchResults searchTerm={searchTerm} />
        )}
      </EuiPanel>
    </section>
  );
};
