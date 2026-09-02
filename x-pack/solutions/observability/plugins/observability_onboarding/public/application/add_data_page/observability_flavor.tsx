/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { CuratedCategory, MiniTile } from '../add_data_grid';
import { VariantCountBadge } from '../add_data_grid';
import type { LogoIconProps } from '../shared/logo_icon';
import { LogoIcon } from '../shared/logo_icon';
import { useManagedOtlpServiceAvailability } from '../shared/use_managed_otlp_service_availability';
import { addPathParamToUrl } from '../package_list_search_form/use_card_url_rewrite';
import { ObservabilityOnboardingPricingFeature } from '../../../common/pricing_features';
import { IS_INGEST_HUB_ONBOARDING_ENABLED } from '../../../common/feature_flags';
import { INTEGRATION_TILES } from './integration_tiles';
import { INTEGRATION_MINI_TILES } from './integration_mini_tiles';
import { useCollectionCards } from './use_collection_cards';
import { usePricingFeature } from '../quickstart_flows/shared/use_pricing_feature';

const tileIcon = (logo: LogoIconProps['logo'], color: LogoIconProps['color']) => (
  <LogoIcon logo={logo} isAvatar size="l" avatarType="space" hasBorder color={color} />
);

/**
 * The o11y flavor of the Add Data grid: plugin tile content plus everything
 * plugin-specific (navigation, icons, test subjects) mapped into view-models.
 */
export const useObservabilityCuratedCategories = ({
  onOpenCollection,
}: {
  onOpenCollection: (groupId: string) => void;
}): CuratedCategory[] => {
  const history = useHistory();
  const { euiTheme, colorMode } = useEuiTheme();
  const collections = useCollectionCards();
  const {
    services: {
      application,
      featureFlags,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

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
    const apmHref = isServerless ? apmUrl : addPathParamToUrl(apmUrl, {});
    const syntheticsUrl = getUrlForApp?.('synthetics', { path: '/add-monitor' });
    const dynamicNavigation: Record<string, { href?: string; onClick?: React.MouseEventHandler }> =
      {
        // ingest_hub's guided AWS flow wins over the CloudWatch quickstart
        // while it rolls out behind its own flag.
        aws: featureFlags.getBooleanValue(IS_INGEST_HUB_ONBOARDING_ENABLED, false)
          ? { href: getUrlForApp?.('onboarding', { path: '/aws' }) }
          : reactRouterNavigate(history, '/aws'),
        opentelemetry: isManagedOtlpServiceAvailable
          ? reactRouterNavigate(history, '/otel-apm')
          : { href: apmHref },
        apm: { href: apmHref },
        synthetic_monitor: {
          href: syntheticsUrl ? addPathParamToUrl(syntheticsUrl, {}) : undefined,
        },
      };

    // A grouped tile opens the chooser like a collection search result. Without a
    // card (flag off, group retired, still loading) it keeps its normal navigation.
    const collectionNavigation = (collectionGroup?: string) => {
      const collection = collectionGroup ? collections.get(collectionGroup) : undefined;
      if (!collection || !collectionGroup) return undefined;
      return {
        onClick: () => onOpenCollection(collectionGroup),
        badge: <VariantCountBadge count={collection.groupMembers.length} />,
      };
    };

    // Logs Essentials (metrics onboarding off) drops the Applications category,
    // mirroring how V1 hid the Application use case on that tier.
    return INTEGRATION_TILES.filter(
      (category) => metricsOnboardingEnabled || category.id !== 'applications'
    ).map((category) => ({
      id: category.id,
      label: category.label,
      tiles: category.tiles.map((tile) => {
        const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;
        const navigation =
          collectionNavigation(tile.collectionGroup) ??
          (tile.route
            ? reactRouterNavigate(history, tile.route)
            : tile.eprPackage
            ? eprDetailNavigation(tile.eprPackage, tile.eprIntegration)
            : dynamicNavigation[tile.id] ?? {});

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
    isServerless,
    isManagedOtlpServiceAvailable,
    metricsOnboardingEnabled,
    collections,
    onOpenCollection,
  ]);
};

export const useObservabilityMiniTiles = ({
  onOpenCollection,
}: {
  onOpenCollection: (groupId: string) => void;
}): MiniTile[] => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const {
    services: {
      application,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const collections = useCollectionCards();
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

  return useMemo(() => {
    const getUrlForApp = application?.getUrlForApp;
    const createUrl = getUrlForApp?.('integrations', { path: '/create' });
    const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
    const apmHref = isServerless ? apmUrl : addPathParamToUrl(apmUrl, {});
    const dynamicNavigation: Record<string, { href?: string; onClick?: React.MouseEventHandler }> =
      {
        opentelemetry: isManagedOtlpServiceAvailable
          ? reactRouterNavigate(history, '/otel-apm')
          : { href: apmHref },
        auto_import: {
          href: createUrl ? addPathParamToUrl(createUrl, {}) : undefined,
        },
        upload_file: {
          href: addPathParamToUrl(`${getUrlForApp?.('home')}#/tutorial_directory/fileDataViz`, {}),
        },
      };

    const pricingState = metricsOnboardingEnabled ? 'metrics' : 'logs-essentials';
    return INTEGRATION_MINI_TILES.filter(
      (tile) => !tile.visibleOn || tile.visibleOn === pricingState
    ).map((tile) => {
      const collectionGroup = tile.collectionGroup;
      const collection = collectionGroup ? collections.get(collectionGroup) : undefined;
      const eprUrl = tile.eprPackage
        ? getUrlForApp?.('integrations', {
            path: `/detail/${tile.eprPackage}/overview`,
          })
        : undefined;
      const navigation =
        collectionGroup && collection
          ? {
              onClick: () => onOpenCollection(collectionGroup),
              badge: <VariantCountBadge count={collection.groupMembers.length} />,
            }
          : tile.route
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
  }, [
    history,
    euiTheme,
    application,
    isServerless,
    isManagedOtlpServiceAvailable,
    metricsOnboardingEnabled,
    collections,
    onOpenCollection,
  ]);
};
