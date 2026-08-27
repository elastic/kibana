/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import {
  CASE_VIEW_PAGE_TABS,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  UserActionTypes,
} from '@kbn/cases-plugin/common';
import type { RenderUserActionExtraActions } from '@kbn/cases-plugin/public';
import { ShowTableButton } from '@kbn/cases-plugin/public';

const ShowAlertButton = lazy(async () => {
  const { ShowAlertButton: Component } = await import(
    '../attachments/alert/components/show_alert_button'
  );
  return { default: Component };
});

/**
 * Extension point for the Cases Activity Log's per-row extra actions slot.
 *
 * - Workflow user action triggered by a single alert with an index → renders the "Show alert"
 *   flyout button.
 * - Workflow user action triggered by one or more alerts → deep-links to the case Alerts tab.
 * - All other user action types → renders nothing.
 *
 * This is a module-level const so the reference is stable and the CasesContext memo does
 * not thrash on every render.
 */
export const renderUserActionExtraActions: RenderUserActionExtraActions = ({ userAction }) => {
  if (userAction.type !== UserActionTypes.workflow) {
    return null;
  }

  const { origin } = userAction.payload;

  if (origin?.type === ALERT_WORKFLOW_ORIGIN_TYPE && origin.index) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <ShowAlertButton id={userAction.id} alertId={origin.id} index={origin.index} />
      </Suspense>
    );
  }

  if (origin?.type === ALERT_WORKFLOW_ORIGIN_TYPE || origin?.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    return <ShowTableButton tabId={CASE_VIEW_PAGE_TABS.ALERTS} />;
  }

  return null;
};
