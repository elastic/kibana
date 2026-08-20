/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CuratedGrid, MiniTilesRow } from '../add_data_grid';
import { BrowseAllIntegrationsTile } from './browse_all_integrations_tile';
import {
  useObservabilityCuratedCategories,
  useObservabilityMiniTiles,
} from './observability_flavor';

/**
 * The o11y host composition of the curated Add Data grid in the Variant A
 * layout: a flat section that stays visible whatever the search state is.
 */
export const ObservabilityIntegrationsSection = ({
  onOpenCollection,
}: {
  /** Names the chooser the page should open, by Fleet's group id. */
  onOpenCollection: (groupId: string) => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'integrationsGridTitle' });
  const categories = useObservabilityCuratedCategories({ onOpenCollection });
  const miniTiles = useObservabilityMiniTiles({ onOpenCollection });

  return (
    <section aria-labelledby={titleId}>
      <EuiTitle size="s">
        <h2 id={titleId}>
          {i18n.translate('xpack.observability_onboarding.integrationsGrid.title', {
            defaultMessage: 'All integrations',
          })}
        </h2>
      </EuiTitle>
      {/* Design spec calls for 12px here, between EuiSpacer's 8px ("s") and 16px ("m") steps. */}
      <EuiSpacer
        size="s"
        css={css`
          block-size: 12px;
        `}
      />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.observability_onboarding.integrationsGrid.subtitle', {
            defaultMessage:
              'Pre-built integrations for your infrastructure and services. Includes dashboards, alerts, and more.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
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
    </section>
  );
};
