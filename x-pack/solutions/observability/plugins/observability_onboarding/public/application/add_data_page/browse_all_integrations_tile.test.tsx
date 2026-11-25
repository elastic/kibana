/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { OBLT_DEFAULT_CATEGORIES } from '@kbn/fleet-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from '@kbn/shared-ux-router';
import React from 'react';
import { OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT } from '../../../common/telemetry_events';
import { BrowseAllIntegrationsTile } from './browse_all_integrations_tile';

const catalogueQuery = OBLT_DEFAULT_CATEGORIES.map((category) => `category=${category}`).join('&');

const renderTile = () => {
  const core = coreMock.createStart();
  render(
    <I18nProvider>
      <KibanaContextProvider services={core}>
        <MemoryRouter initialEntries={['/']}>
          <BrowseAllIntegrationsTile />
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return core;
};

describe('BrowseAllIntegrationsTile', () => {
  // A path category would drop Fleet's OpenTelemetry default, so the tile sends both filters as query params.
  it('opens the catalogue filtered by Observability and OpenTelemetry with a way back', async () => {
    const user = userEvent.setup();
    const core = renderTile();

    await user.click(screen.getByTestId('observabilityOnboardingBrowseAllIntegrationsTile'));

    expect(core.application.navigateToApp).toHaveBeenCalledTimes(1);
    expect(core.application.navigateToApp).toHaveBeenCalledWith('integrations', {
      path: `/browse?${catalogueQuery}&returnAppId=observabilityOnboarding&returnPath=${encodeURIComponent(
        '?'
      )}`,
    });
  });

  it('reports the click as the browse_all mini tile', async () => {
    const user = userEvent.setup();
    const core = renderTile();

    await user.click(screen.getByTestId('observabilityOnboardingBrowseAllIntegrationsTile'));

    expect(core.analytics.reportEvent).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT.eventType,
      { tile_id: 'browse_all', surface: 'mini_tile', has_search_term: false }
    );
  });
});
