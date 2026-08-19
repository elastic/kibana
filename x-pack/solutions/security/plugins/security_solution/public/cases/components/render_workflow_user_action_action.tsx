/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { CASE_VIEW_PAGE_TABS } from '@kbn/cases-plugin/common';
import { ShowTableButton, type RenderWorkflowUserActionAction } from '@kbn/cases-plugin/public';
import React, { lazy, Suspense } from 'react';

const ShowAlertButton = lazy(async () => {
  const { ShowAlertButton: Component } = await import(
    '../attachments/alert/components/show_alert_button'
  );
  return { default: Component };
});

export const renderWorkflowUserActionAction: RenderWorkflowUserActionAction = ({
  origin,
  userActionId,
}) => {
  if (origin.type === 'cases.alert' && origin.index) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <ShowAlertButton id={userActionId} alertId={origin.id} index={origin.index} />
      </Suspense>
    );
  }

  if (origin.type === 'cases.alert' || origin.type === 'cases.alerts') {
    return <ShowTableButton tabId={CASE_VIEW_PAGE_TABS.ALERTS} />;
  }

  return null;
};
