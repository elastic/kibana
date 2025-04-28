/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { useNavigation } from '../../kibana';
import { APP_INTEGRATIONS_PATH, ONBOARDING_PATH } from '../../../../../common/constants';

import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  INTEGRATION_APP_ID,
  MAX_CARD_HEIGHT_IN_PX,
  TELEMETRY_INTEGRATION_CARD,
} from '../constants';
import type { GetAppUrl, NavigateTo } from '../../kibana';
import type { TrackLinkClick } from './integration_context';
import { getIntegrationLinkState } from '../../../hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../utils/integrations';
import { useIntegrationContext } from './integration_context';

const extractFeaturedCards = (filteredCards: IntegrationCardItem[], featuredCardIds: string[]) => {
  return filteredCards.reduce<IntegrationCardItem[]>((acc, card) => {
    if (featuredCardIds.includes(card.id)) {
      acc.push(card);
    }
    return acc;
  }, []);
};

const getFilteredCards = ({
  featuredCardIds,
  getAppUrl,
  integrationsList,
  navigateTo,
  trackLinkClick,
}: {
  featuredCardIds?: string[];
  getAppUrl: GetAppUrl;
  integrationsList: IntegrationCardItem[];
  navigateTo: NavigateTo;
  trackLinkClick?: TrackLinkClick;
}) => {
  const securityIntegrationsList = integrationsList.map((card) =>
    addSecuritySpecificProps({
      navigateTo,
      getAppUrl,
      card,
      trackLinkClick,
    })
  );
  if (!featuredCardIds) {
    return { featuredCards: [], integrationCards: securityIntegrationsList };
  }
  const featuredCards = extractFeaturedCards(securityIntegrationsList, featuredCardIds);
  return {
    featuredCards,
    integrationCards: securityIntegrationsList,
  };
};

export const addSecuritySpecificProps = ({
  navigateTo,
  getAppUrl,
  card,
  trackLinkClick,
}: {
  navigateTo: NavigateTo;
  getAppUrl: GetAppUrl;
  card: IntegrationCardItem;
  trackLinkClick?: TrackLinkClick;
}): IntegrationCardItem => {
  const onboardingLink = getAppUrl({ appId: SECURITY_UI_APP_ID, path: ONBOARDING_PATH });
  const integrationRootUrl = getAppUrl({ appId: INTEGRATION_APP_ID });
  const state = getIntegrationLinkState(ONBOARDING_PATH, getAppUrl);
  const url =
    card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
      ? addPathParamToUrl(card.url, ONBOARDING_PATH)
      : card.url;

  return {
    ...card,
    titleLineClamp: CARD_TITLE_LINE_CLAMP,
    descriptionLineClamp: CARD_DESCRIPTION_LINE_CLAMP,
    maxCardHeight: MAX_CARD_HEIGHT_IN_PX,
    showInstallationStatus: true,
    url,
    onCardClick: () => {
      const trackId = `${TELEMETRY_INTEGRATION_CARD}_${card.id}`;
      trackLinkClick?.(trackId);
      if (url.startsWith(APP_INTEGRATIONS_PATH)) {
        navigateTo({
          appId: INTEGRATION_APP_ID,
          path: url.slice(integrationRootUrl.length),
          state,
        });
      } else if (url.startsWith('http') || url.startsWith('https')) {
        window.open(url, '_blank');
      } else {
        navigateTo({ url, state });
      }
    },
  };
};

export const useIntegrationCardList = ({
  integrationsList,
  featuredCardIds,
}: {
  integrationsList: IntegrationCardItem[];
  featuredCardIds?: string[] | undefined;
}): IntegrationCardItem[] => {
  const { navigateTo, getAppUrl } = useNavigation();

  const {
    telemetry: { trackLinkClick },
  } = useIntegrationContext();
  const { featuredCards, integrationCards } = useMemo(
    () =>
      getFilteredCards({
        navigateTo,
        getAppUrl,
        integrationsList,
        featuredCardIds,
        trackLinkClick,
      }),
    [navigateTo, getAppUrl, integrationsList, featuredCardIds, trackLinkClick]
  );

  if (featuredCardIds && featuredCardIds.length > 0) {
    return featuredCards;
  }
  return integrationCards ?? [];
};
