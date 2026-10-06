/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem, EuiLoadingSpinner } from '@elastic/eui';
import type {
  EpisodeAction,
  EpisodeActionContext,
  EpisodeActionMenuItemContext,
} from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { ClassicAlertActionContext } from '@kbn/alerting-v2-episodes-ui/classic_alerts/utils/map_alert';
import { useInvestigateAlert } from '@kbn/observability-plugin/public';

export const INVESTIGATE_EPISODE_ACTION_ID = 'OBSERVABILITY_ALERTING_INVESTIGATE_EPISODE';

export const isClassicAlertEpisode = (episode: AlertEpisode): boolean => {
  const ctx = episode.source_action_context as ClassicAlertActionContext | undefined;
  return Boolean(ctx?.alertUuid);
};

export const getAlertIdFromEpisode = (episode: AlertEpisode): string | undefined => {
  const ctx = episode.source_action_context as ClassicAlertActionContext | undefined;
  return ctx?.alertUuid;
};

interface InvestigateEpisodeMenuItemProps {
  episode: AlertEpisode;
  onSuccess?: () => void;
  closeMenu?: () => void;
  surface?: EpisodeActionMenuItemContext['surface'];
}

export const InvestigateEpisodeMenuItem = ({
  episode,
  onSuccess,
  closeMenu,
  surface,
}: InvestigateEpisodeMenuItemProps) => {
  const alertId = getAlertIdFromEpisode(episode);
  const {
    showInvestigateAction,
    showInvestigateButton,
    showViewInvestigation,
    handleInvestigate,
    isInvestigating,
    investigateActionLabel,
    investigateEbtProps,
    viewInvestigationUrl,
    viewInvestigationActionLabel,
    viewInvestigationEbtProps,
    markInvestigationViewed,
  } = useInvestigateAlert({
    alertId,
    ebtElement:
      surface === 'details_flyout' ? 'alertDetailsFlyoutActions' : 'episodesTableRowActions',
    enabled: Boolean(alertId),
    onInvestigate: onSuccess,
  });

  const onInvestigateClick = useCallback(async () => {
    await handleInvestigate();
  }, [handleInvestigate]);

  if (!showInvestigateAction) {
    return null;
  }

  if (isInvestigating) {
    return (
      <EuiContextMenuItem
        data-test-subj="investigateAlert"
        disabled
        icon={<EuiLoadingSpinner size="m" />}
      >
        {investigateActionLabel}
      </EuiContextMenuItem>
    );
  }

  return (
    <>
      {showViewInvestigation && (
        <EuiContextMenuItem
          data-test-subj="viewAlertInvestigation"
          {...viewInvestigationEbtProps}
          href={viewInvestigationUrl}
          icon="eye"
          onClick={() => {
            markInvestigationViewed();
            closeMenu?.();
          }}
        >
          {viewInvestigationActionLabel}
        </EuiContextMenuItem>
      )}
      {showInvestigateButton && (
        <EuiContextMenuItem
          data-test-subj="investigateAlert"
          {...investigateEbtProps}
          icon="inspect"
          onClick={onInvestigateClick}
        >
          {investigateActionLabel}
        </EuiContextMenuItem>
      )}
    </>
  );
};

export const createInvestigateEpisodeAction = (): EpisodeAction => ({
  id: INVESTIGATE_EPISODE_ACTION_ID,
  order: 35,
  isWorkflowAction: true,
  displayName: i18n.translate('xpack.observabilityAlerting.actions.investigateDisplayName', {
    defaultMessage: 'Investigate',
  }),
  iconType: 'inspect',
  supportsBulk: false,
  isCompatible: ({ episodes }: EpisodeActionContext) => {
    if (episodes.length !== 1) return false;
    return isClassicAlertEpisode(episodes[0]);
  },
  showWhenDisabled: ({ episodes }: EpisodeActionContext) => {
    if (episodes.length !== 1) return false;
    return isClassicAlertEpisode(episodes[0]);
  },
  renderMenuItem: ({ episodes, onSuccess, closeMenu, surface }: EpisodeActionMenuItemContext) => {
    if (episodes.length !== 1) return null;
    return (
      <InvestigateEpisodeMenuItem
        episode={episodes[0]}
        onSuccess={onSuccess}
        closeMenu={closeMenu}
        surface={surface}
      />
    );
  },
  execute: async () => {},
});
