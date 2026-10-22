/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { SubjectHrefResolver } from '@kbn/agentic-investigations-plugin/public';
import { NIGHTSHIFT_APP_ID, OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_EVENT_ID_QUERY_PARAM } from '../common/url_params';

/**
 * Opens the subjects Nightshift starts investigations on: a significant event in the detections
 * page's event flyout, and an alert on the Observability alert details page, which loads any alert
 * the user can read (Nightshift runs on Observability projects only). The subject id of an alert
 * is its `kibana.alert.uuid`.
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
    if (type === 'alert') {
      return application.getUrlForApp(OBSERVABILITY_OVERVIEW_APP_ID, {
        path: `/alerts/${encodeURIComponent(snapshot?.id ?? id)}`,
      });
    }
    return undefined;
  };
