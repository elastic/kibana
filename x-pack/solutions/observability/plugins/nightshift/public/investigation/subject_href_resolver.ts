/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { SubjectHrefResolver } from '@kbn/agentic-investigations-plugin/public';
import { NIGHTSHIFT_APP_ID, OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { NIGHTSHIFT_EVENT_ID_QUERY_PARAM } from '../common/url_params';

/**
 * Observability rule types, whose alerts the Observability alert details page shows. Alerts of
 * other rule types (for example stack rules created outside Observability) may not load there, so
 * they keep the link the rule type writes, if any.
 */
const hasAlertDetailsPage = (ruleTypeId: string | undefined): boolean =>
  ruleTypeId !== undefined && OBSERVABILITY_RULE_TYPE_IDS.some((id) => id === ruleTypeId);

/**
 * Opens the subjects Nightshift starts investigations on: a significant event in the detections
 * page's event flyout, and an alert of an Observability rule type on its alert details page. The
 * subject id of an alert is its `kibana.alert.uuid`.
 */
export const createNightshiftSubjectHrefResolver =
  (application: Pick<ApplicationStart, 'getUrlForApp'>): SubjectHrefResolver =>
  ({ type, id, snapshot }) => {
    if (type === 'significant_event') {
      const search = new URLSearchParams({ [NIGHTSHIFT_EVENT_ID_QUERY_PARAM]: id });
      return application.getUrlForApp(NIGHTSHIFT_APP_ID, {
        path: `/detections/events?${search.toString()}`,
      });
    }
    if (type === 'alert' && hasAlertDetailsPage(snapshot?.rule_type_id)) {
      return application.getUrlForApp(OBSERVABILITY_OVERVIEW_APP_ID, {
        path: `/alerts/${encodeURIComponent(snapshot?.id ?? id)}`,
      });
    }
    return undefined;
  };
