/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import type {
  CommonAttachmentTabViewProps,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import {
  AttachmentActionType,
  CASE_VIEW_PAGE_TABS,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  getNonEmptyField,
  toStringArray,
  type AlertAttachmentMetadata,
} from '@kbn/cases-plugin/common';
import { ObservabilityAlertAttachmentPayloadSchema } from '../../../../common/cases/attachments/alert';
import {
  ALERT_AVATAR_ARIA_LABEL,
  ALERT_DISPLAY_NAME,
  DELETE_ALERTS_SUCCESS_TITLE,
  REMOVED_ALERT_LABEL_TITLE,
  REMOVED_ALERTS_LABEL_TITLE,
} from './translations';

const AlertEvent = lazy(async () => {
  const { AlertEvent: Component } = await import('./components/alert_event');
  return { default: Component };
});

const AlertTabContent = lazy(async () => {
  const { AlertTabContent: Component } = await import('./components/alert_tab_content');
  return { default: Component };
});

const ShowAlertButton = lazy(async () => {
  const { ShowAlertButton: Component } = await import('./components/show_alert_button');
  return { default: Component };
});

const ShowTableButton = lazy(async () => {
  const { ShowTableButton: Component } = await import('@kbn/cases-plugin/public');
  return { default: Component };
});

function AlertTabContentWrapper(props: CommonAttachmentTabViewProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner size="l" />}>
      <AlertTabContent {...props} />
    </Suspense>
  );
}

type ObservabilityAlertViewProps = UnifiedReferenceAttachmentViewProps<AlertAttachmentMetadata>;

const getAttachmentViewObject = (props: ObservabilityAlertViewProps) => {
  const { savedObjectId, attachmentId, metadata } = props;
  const alertIds = toStringArray(attachmentId);
  const totalAlerts = alertIds.length;
  const isSingleAlert = totalAlerts === 1;

  const alertId = getNonEmptyField(alertIds[0]);

  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <AlertEvent
          alertId={alertId ?? ''}
          totalAlerts={totalAlerts}
          savedObjectId={savedObjectId}
          rule={metadata?.rule}
        />
      </Suspense>
    ),
    timelineAvatar: (
      <EuiAvatar
        name="alert"
        color="subdued"
        iconType="bell"
        aria-label={ALERT_AVATAR_ARIA_LABEL}
      />
    ),
    deleteSuccessTitle: DELETE_ALERTS_SUCCESS_TITLE(Math.max(totalAlerts, 1)),
    getActions: (actionProps: ObservabilityAlertViewProps) => {
      const actions = [];
      actions.push({
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => (
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            {isSingleAlert && alertId ? (
              <ShowAlertButton id={actionProps.savedObjectId} alertId={alertId} />
            ) : (
              <ShowTableButton tabId={CASE_VIEW_PAGE_TABS.ALERTS} />
            )}
          </Suspense>
        ),
      });
      return actions;
    },
  };
};

const getAttachmentRemovalObject = (props: ObservabilityAlertViewProps) => {
  const alertIds = toStringArray(props.attachmentId);
  if (alertIds.length <= 1) {
    return { event: REMOVED_ALERT_LABEL_TITLE };
  }
  return { event: REMOVED_ALERTS_LABEL_TITLE(alertIds.length) };
};

export const getObservabilityAlertType = () =>
  defineAttachment({
    id: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
    displayName: ALERT_DISPLAY_NAME,
    icon: 'bell',
    getAttachmentViewObject,
    getAttachmentRemovalObject,
    getAttachmentTabViewObject: () => ({
      children: AlertTabContentWrapper,
    }),
    schema: ObservabilityAlertAttachmentPayloadSchema,
  });
