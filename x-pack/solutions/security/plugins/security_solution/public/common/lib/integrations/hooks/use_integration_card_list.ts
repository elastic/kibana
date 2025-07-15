/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import { useNavigation } from '../../kibana';
import { APP_INTEGRATIONS_PATH, ONBOARDING_PATH } from '../../../../../common/constants';

import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  INTEGRATION_APP_ID,
  MAX_CARD_HEIGHT_IN_PX,
  TELEMETRY_INTEGRATION_CARD,
} from '../constants';
import { useIntegrationContext } from './integration_context';
import { getIntegrationLinkState } from '../../../hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../utils/integrations';
import type { UseSelectedTabReturn } from './use_selected_tab';

export type GetCardItemExtraProps = (card: IntegrationCardItem) => Partial<IntegrationCardItem>;

const useAddSecurityProps = (activeIntegrations: GetInstalledPackagesResponse['items']) => {
  const { navigateTo, getAppUrl } = useNavigation();
  const { telemetry } = useIntegrationContext();

  return useCallback(
    (card: IntegrationCardItem): IntegrationCardItem => {
      const integrationRootUrl = getAppUrl({ appId: INTEGRATION_APP_ID });
      const state = getIntegrationLinkState(ONBOARDING_PATH, getAppUrl);
      const url = card.url.includes(APP_INTEGRATIONS_PATH)
        ? addPathParamToUrl(card.url, ONBOARDING_PATH)
        : card.url;
      const isActive = activeIntegrations.some((integration) => integration.name === card.name);

      return {
        ...card,
        titleLineClamp: CARD_TITLE_LINE_CLAMP,
        descriptionLineClamp: CARD_DESCRIPTION_LINE_CLAMP,
        maxCardHeight: MAX_CARD_HEIGHT_IN_PX,
        showInstallationStatus: true,
        url,
        hasDataStreams: isActive,
        onCardClick: () => {
          const trackId = `${TELEMETRY_INTEGRATION_CARD}_${card.id}`;
          telemetry.reportLinkClick?.(trackId);
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
    },
    [activeIntegrations, navigateTo, getAppUrl, telemetry]
  );
};

interface UseIntegrationCardListProps {
  integrationsList: IntegrationCardItem[];
  activeIntegrations: GetInstalledPackagesResponse['items'];
  selectedTab: UseSelectedTabReturn['selectedTab'];
}
export const useIntegrationCardList = ({
  integrationsList,
  activeIntegrations,
  selectedTab,
}: UseIntegrationCardListProps): IntegrationCardItem[] => {
  const featuredCardIds = selectedTab?.featuredCardIds;

  const addSecurityProps = useAddSecurityProps(activeIntegrations);

  const integrationCards = useMemo(
    () => integrationsList.map((card) => addSecurityProps(card)),
    [integrationsList, addSecurityProps]
  );

  if (featuredCardIds && featuredCardIds.length > 0) {
    return integrationCards.filter((card) => featuredCardIds.includes(card.id));
  }
  return integrationCards ?? [];
};
