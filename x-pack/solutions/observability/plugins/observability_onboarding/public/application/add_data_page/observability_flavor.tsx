/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { syntheticsAddMonitorLocatorID } from '@kbn/observability-plugin/common';
import { useHistory } from 'react-router-dom';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { CuratedCategory, MiniTile } from '../add_data_grid';
import type { LogoIconProps } from '../shared/logo_icon';
import { LogoIcon } from '../shared/logo_icon';
import { useManagedOtlpServiceAvailability } from '../shared/use_managed_otlp_service_availability';
import { addPathParamToUrl } from '../package_list_search_form/use_card_url_rewrite';
import { IS_INGEST_HUB_ONBOARDING_ENABLED } from '../../../common/feature_flags';
import { INTEGRATION_TILES } from './integration_tiles';
import { INTEGRATION_MINI_TILES } from './integration_mini_tiles';

const tileIcon = (logo: LogoIconProps['logo'], color: LogoIconProps['color']) => (
  <LogoIcon logo={logo} isAvatar size="l" avatarType="space" hasBorder color={color} />
);

/**
 * The o11y flavor of the Add Data grid: plugin tile content plus everything
 * plugin-specific (navigation, icons, test subjects) mapped into view-models.
 */
export const useObservabilityCuratedCategories = (): CuratedCategory[] => {
  const history = useHistory();
  const { euiTheme, colorMode } = useEuiTheme();
  const {
    services: {
      application,
      featureFlags,
      share,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  return useMemo(() => {
    const getUrlForApp = application?.getUrlForApp;
    const eprDetailNavigation = (eprPackage: string, eprIntegration?: string) => {
      const url = getUrlForApp?.('integrations', {
        path: `/detail/${eprPackage}/overview${
          eprIntegration ? `?integration=${eprIntegration}` : ''
        }`,
      });
      return { href: url ? addPathParamToUrl(url, {}) : undefined };
    };

    const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
    const syntheticsLocator = share?.url.locators.get(syntheticsAddMonitorLocatorID);
    const dynamicNavigation: Record<string, { href?: string; onClick?: React.MouseEventHandler }> =
      {
        // ingest_hub's guided AWS flow wins over the CloudWatch quickstart
        // while it rolls out behind its own flag.
        aws: featureFlags.getBooleanValue(IS_INGEST_HUB_ONBOARDING_ENABLED, false)
          ? { href: getUrlForApp?.('onboarding', { path: '/aws' }) }
          : reactRouterNavigate(history, '/aws'),
        opentelemetry: isManagedOtlpServiceAvailable
          ? reactRouterNavigate(history, '/otel-apm')
          : { href: apmUrl },
        apm: { href: apmUrl },
        synthetic_monitor: { href: syntheticsLocator?.getRedirectUrl({ scope: 'create' }) },
      };

    return INTEGRATION_TILES.map((category) => ({
      id: category.id,
      label: category.label,
      tiles: category.tiles.map((tile) => {
        const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;
        const navigation = tile.route
          ? reactRouterNavigate(history, tile.route)
          : tile.eprPackage
          ? eprDetailNavigation(tile.eprPackage, tile.eprIntegration)
          : dynamicNavigation[tile.id] ?? {};

        return {
          id: tile.id,
          title: tile.title,
          description: tile.description,
          icon: tileIcon(resolvedLogo, euiTheme.colors.backgroundBaseSubdued),
          'data-test-subj': `observabilityOnboardingIntegrationTile-${tile.id}`,
          ...navigation,
        };
      }),
    }));
  }, [
    history,
    colorMode,
    euiTheme,
    application,
    featureFlags,
    share,
    isServerless,
    isManagedOtlpServiceAvailable,
  ]);
};

export const useObservabilityMiniTiles = (): MiniTile[] => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  return useMemo(() => {
    const getUrlForApp = application?.getUrlForApp;
    const dynamicNavigation: Record<string, { href?: string }> = {
      auto_import: { href: getUrlForApp?.('integrations', { path: '/create' }) },
      upload_file: { href: `${getUrlForApp?.('home')}#/tutorial_directory/fileDataViz` },
    };

    return INTEGRATION_MINI_TILES.map((tile) => {
      const eprUrl = tile.eprPackage
        ? getUrlForApp?.('integrations', {
            path: `/detail/${tile.eprPackage}/overview`,
          })
        : undefined;
      const navigation = tile.route
        ? reactRouterNavigate(history, tile.route)
        : tile.eprPackage
        ? { href: eprUrl ? addPathParamToUrl(eprUrl, {}) : undefined }
        : dynamicNavigation[tile.id] ?? {};

      return {
        id: tile.id,
        title: tile.title,
        icon: tileIcon(tile.logo, euiTheme.colors.backgroundBaseSubdued),
        'data-test-subj': `observabilityOnboardingIntegrationMiniTile-${tile.id}`,
        ...navigation,
      };
    });
  }, [history, euiTheme, application]);
};
