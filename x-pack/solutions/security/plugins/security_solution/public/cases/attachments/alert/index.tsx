/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, type ComponentType } from 'react';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import type {
  CommonAttachmentTabViewProps,
  UnifiedReferenceAttachmentType,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public';
import {
  AttachmentActionType,
  CASE_VIEW_PAGE_TABS,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  getNonEmptyField,
  toStringArray,
} from '@kbn/cases-plugin/common';
import { decodeSecurityAlert } from '../../../../common/cases/attachments/alert';
import * as i18n from './translations';

const AlertEvent = lazy(async () => {
  const { AlertEvent: Component } = await import('./components/alert_event');
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

const AlertTabContent = lazy(async () => {
  const { AlertTabContent: Component } = await import('./components/alert_tab_content');
  return { default: Component };
});

const AlertTabContentWrapper: ComponentType<CommonAttachmentTabViewProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <AlertTabContent {...props} />
  </Suspense>
);

const getAttachmentViewObject = (props: UnifiedReferenceAttachmentViewProps) => {
  const { savedObjectId, attachmentId, metadata } = props;
  const alertIds = toStringArray(attachmentId);
  const totalAlerts = alertIds.length;
  const isSingleAlert = totalAlerts === 1;
  const index = getNonEmptyField(metadata?.index);
  const alertId = getNonEmptyField(alertIds[0]);
  const rule = (metadata?.rule ?? null) as { id: string | null; name: string | null } | null;
  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <AlertEvent
          alertId={alertId ?? ''}
          totalAlerts={totalAlerts}
          savedObjectId={savedObjectId}
          rule={rule}
        />
      </Suspense>
    ),
    timelineAvatar: (
      <EuiAvatar
        name="alert"
        color="subdued"
        iconType="bell"
        aria-label={i18n.ALERT_AVATAR_ARIA_LABEL}
      />
    ),
    deleteSuccessTitle: i18n.DELETE_ALERTS_SUCCESS_TITLE(Math.max(totalAlerts, 1)),
    getActions: (actionProps: UnifiedReferenceAttachmentViewProps) => {
      const actions = [];
      actions.push({
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => (
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            {isSingleAlert && alertId && index ? (
              <ShowAlertButton id={actionProps.savedObjectId} alertId={alertId} index={index} />
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

const getAttachmentRemovalObject = (props: UnifiedReferenceAttachmentViewProps) => {
  const alertIds = toStringArray(props.attachmentId);
  if (alertIds.length <= 1) {
    return { event: i18n.REMOVED_ALERT_LABEL_TITLE };
  }
  return { event: i18n.REMOVED_ALERTS_LABEL_TITLE(alertIds.length) };
};

/**
 * Returns the alert attachment type for registration with the unified registry.
 */
export const getSecurityAlertType = (): UnifiedReferenceAttachmentType => ({
  id: SECURITY_ALERT_ATTACHMENT_TYPE,
  displayName: i18n.ALERT_DISPLAY_NAME,
  icon: 'bell',
  getAttachmentViewObject,
  getAttachmentRemovalObject,
  getAttachmentTabViewObject: () => ({
    children: AlertTabContentWrapper,
  }),
  schemaValidator: (metadata: unknown) => {
    decodeSecurityAlert(metadata);
  },
});
