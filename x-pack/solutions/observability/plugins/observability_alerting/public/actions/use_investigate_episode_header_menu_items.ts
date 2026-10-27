/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useInvestigateAlert } from '@kbn/observability-plugin/public';
import { getAlertIdFromEpisode } from './investigate_episode_action';

/** Adds investigation controls to the Universal alert details header. */
export const useInvestigateEpisodeHeaderMenuItems = (
  episode: AlertEpisode | undefined
): NonNullable<AppHeaderMenu['items']> => {
  const { services } = useKibana<Pick<CoreStart, 'application'>>();
  const {
    showInvestigateAction,
    showInvestigateButton,
    hasInvestigation,
    handleInvestigate,
    isStarting,
    investigateActionLabel,
    investigateEbtProps,
    viewInvestigationUrl,
    viewInvestigationActionLabel,
    viewInvestigationEbtProps,
    markInvestigationViewed,
  } = useInvestigateAlert({
    alertId: episode ? getAlertIdFromEpisode(episode) : undefined,
    ebtElement: 'alertDetailsPageActions',
  });

  if (
    !episode ||
    !showInvestigateAction ||
    !(isStarting || viewInvestigationUrl || (showInvestigateButton && !hasInvestigation))
  ) {
    return [];
  }

  const showView = Boolean(viewInvestigationUrl) && !isStarting;
  const ebtProps = showView ? viewInvestigationEbtProps : investigateEbtProps;
  const items: NonNullable<AppHeaderMenu['items']> = [
    {
      id: 'OBSERVABILITY_ALERTING_INVESTIGATION_HEADER',
      label: showView ? viewInvestigationActionLabel : investigateActionLabel,
      iconType: 'inspect',
      order: -1,
      overflow: false,
      disableButton: isStarting,
      isLoading: isStarting,
      href: showView ? viewInvestigationUrl : undefined,
      run: showView
        ? () => {
            markInvestigationViewed();
            if (viewInvestigationUrl) {
              void services.application.navigateToUrl(viewInvestigationUrl);
            }
          }
        : () => void handleInvestigate(),
      testId: showView ? 'episodeDetailsViewInvestigation' : 'episodeDetailsInvestigate',
      ebt: {
        action: ebtProps['data-ebt-action'],
        detail: ebtProps['data-ebt-detail'],
      },
    },
  ];

  if (showInvestigateButton && hasInvestigation && !isStarting) {
    items.push({
      id: 'OBSERVABILITY_ALERTING_REINVESTIGATE_HEADER',
      label: investigateActionLabel,
      iconType: 'inspect',
      overflow: true,
      run: () => void handleInvestigate(),
      testId: 'episodeDetailsReinvestigate',
      ebt: {
        action: investigateEbtProps['data-ebt-action'],
        detail: investigateEbtProps['data-ebt-detail'],
      },
    });
  }

  return items;
};
