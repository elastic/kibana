/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { getAlertViewInAppUrl, type AlertFormatter } from '@kbn/alerts-ui-shared';
import { ALERT_GROUP, ALERT_GROUP_FIELD, ALERT_GROUP_VALUE } from '@kbn/rule-data-utils';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { CLASSIC_EPISODE_SOURCE_ID } from '@kbn/alerting-v2-episodes-ui/classic_alerts/constants';
import type { ClassicAlertActionContext } from '@kbn/alerting-v2-episodes-ui/classic_alerts/utils/map_alert';
import { fetchClassicAlertById } from '@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id';
import { getErrorMessage } from '@kbn/alerting-v2-episodes-ui/actions/helpers';

export const VIEW_V1_ALERT_IN_APP_ACTION_ID = 'VIEW_V1_ALERT_IN_APP';

export const VIEW_IN_APP = i18n.translate(
  'xpack.observabilityAlerting.actions.viewInAppDisplayName',
  { defaultMessage: 'View in app' }
);

export const VIEW_IN_APP_NO_LINK = i18n.translate(
  'xpack.observabilityAlerting.actions.viewInAppNoLinkTitle',
  { defaultMessage: 'No app view is available for this alert' }
);

export const VIEW_IN_APP_ERROR = i18n.translate(
  'xpack.observabilityAlerting.actions.viewInAppErrorTitle',
  { defaultMessage: 'Unable to open the alert in its app' }
);

export interface ViewInAppActionDeps {
  http: HttpStart;
  notifications: NotificationsStart;
  /** Returns the formatter registered for a rule type, which resolves the alert's app link. */
  getAlertFormatter: (ruleTypeId: string) => AlertFormatter | undefined;
}

const getClassicActionContext = (episode: AlertEpisode): ClassicAlertActionContext | undefined =>
  episode.source_id === CLASSIC_EPISODE_SOURCE_ID
    ? (episode.source_action_context as ClassicAlertActionContext | undefined)
    : undefined;

interface ViewInAppTarget {
  alertUuid: string;
  ruleTypeId: string;
  formatter: AlertFormatter;
}

const getViewInAppTarget = (
  episodes: AlertEpisode[],
  getAlertFormatter: ViewInAppActionDeps['getAlertFormatter']
): ViewInAppTarget | undefined => {
  if (episodes.length !== 1) return undefined;

  const context = getClassicActionContext(episodes[0]);
  if (!context?.ruleTypeId) return undefined;

  const { alertUuid, ruleTypeId } = context;
  const formatter = getAlertFormatter(ruleTypeId);
  return formatter ? { alertUuid, ruleTypeId, formatter } : undefined;
};

interface AlertGroup {
  field?: unknown;
  value?: unknown;
}

/**
 * Prepares a classic alert `_source` document for its rule type's formatter. `_source` stores
 * groups only as `kibana.alert.group` objects, while formatters read the parallel
 * `kibana.alert.group.field` / `kibana.alert.group.value` arrays that the fields API returns.
 */
const toFormatterFields = (source: Record<string, unknown>): Record<string, unknown> => {
  const groups = source[ALERT_GROUP];
  if (groups == null || source[ALERT_GROUP_FIELD] != null) {
    return source;
  }

  const groupList = castArray(groups) as AlertGroup[];
  return {
    ...source,
    [ALERT_GROUP_FIELD]: groupList.map(({ field }) => field),
    [ALERT_GROUP_VALUE]: groupList.map(({ value }) => value),
  };
};

/**
 * Opens a classic (v1) alert in the app that owns its rule type, using the link resolved
 * by the rule type's alert formatter from the full alert document.
 */
export const createViewInAppAction = ({
  http,
  notifications,
  getAlertFormatter,
}: ViewInAppActionDeps): EpisodeAction => ({
  id: VIEW_V1_ALERT_IN_APP_ACTION_ID,
  order: 25,
  displayName: VIEW_IN_APP,
  iconType: 'magnify',
  isNavigationAction: true,
  supportsBulk: false,
  enforcesOwnPrivileges: true,
  isCompatible: ({ episodes }) => getViewInAppTarget(episodes, getAlertFormatter) != null,
  execute: async ({ episodes }) => {
    const target = getViewInAppTarget(episodes, getAlertFormatter);
    if (!target) return;
    const { alertUuid, ruleTypeId, formatter } = target;

    /*
     * Opened before the fetch, while the click still counts as a user gesture, so popup
     * blockers allow it. Navigated or closed once the link is resolved.
     */
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.opener = null;
    }

    let url: string | null;
    try {
      const alert = await fetchClassicAlertById({
        ruleTypeIds: [ruleTypeId],
        id: alertUuid,
        services: { http },
      });
      url = getAlertViewInAppUrl({
        alert: toFormatterFields(alert),
        formatter,
        prepend: http.basePath.prepend,
        unwrapArrayValues: false,
      });
    } catch (error) {
      newTab?.close();
      notifications.toasts.addDanger({
        title: VIEW_IN_APP_ERROR,
        text: getErrorMessage(error),
      });
      return;
    }

    if (!url) {
      newTab?.close();
      notifications.toasts.addWarning({ title: VIEW_IN_APP_NO_LINK });
      return;
    }

    if (!newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // The user closed the tab while the link was resolving.
    if (newTab.closed) return;
    newTab.location.href = url;
  },
});
