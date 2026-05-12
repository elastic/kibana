/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionButton,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
  CanvasRenderCallbacks,
  GetActionButtonsParams,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../common/agent_builder';

type MonitorAttachment = Attachment<
  typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MonitorAttachmentData
>;

/**
 * Lazy import for the inline content body. Keeps the attachment-type
 * registration itself a small, side-effect-free module so registering
 * doesn't pull EUI components into the agent_builder bootstrap chunk.
 *
 * The dynamic `import()` resolves to a webpack chunk named after the
 * file path; the chunk only loads when an attachment of this type is
 * actually rendered.
 */
const LazyMonitorManagementInlineContent = React.lazy(async () => {
  const { MonitorManagementInlineContent } = await import('./monitor_management_inline_content');
  return { default: MonitorManagementInlineContent };
});

/**
 * Lazy import for the canvas content body. Same chunk-isolation
 * rationale as the inline content — but stricter: the canvas pulls in
 * `EuiDescriptionList`, save / update HTTP wrappers, the canvas-action
 * registration hook, and the @kbn/core ApplicationStart contract. We
 * only want all of that in the bundle when the user actually opens
 * the canvas flyout.
 */
const LazyMonitorManagementCanvasContent = React.lazy(async () => {
  const { MonitorManagementCanvasContent } = await import('./monitor_management_canvas_content');
  return { default: MonitorManagementCanvasContent };
});

const getAttachmentLabel = (attachment: MonitorAttachment): string => {
  const name = attachment.data?.name;
  if (name && name.length > 0) {
    return name;
  }
  return i18n.translate('xpack.synthetics.agentBuilder.monitor.defaultLabel', {
    defaultMessage: 'New Synthetics monitor',
  });
};

const renderInlineContent = (props: AttachmentRenderProps<MonitorAttachment>): React.ReactNode => {
  const { attachment } = props;
  if (!attachment.data) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <LazyMonitorManagementInlineContent data={attachment.data} />
    </Suspense>
  );
};

/**
 * Inline action buttons. Returns a single "Preview" button whose
 * handler is the framework-provided `openCanvas` callback.
 *
 * Without this, the inline card has no affordance to open the canvas
 * flyout — and the canvas is where the status-specific Create / Update /
 * View buttons live (see `use_monitor_canvas_actions.ts`). Caught
 * during T9 manual testing: an inline-only render leaves users with no path
 * to persist the proposed monitor.
 *
 * Mirrors the `dashboard_agent` precedent
 * (`x-pack/platform/plugins/shared/dashboard_agent/public/attachment_types/index.tsx`).
 * When already inside the canvas (`isCanvas: true`, `openCanvas: undefined`),
 * returns an empty array so the button doesn't double up.
 */
const getActionButtons = ({
  isCanvas,
  openCanvas,
}: GetActionButtonsParams<MonitorAttachment>): ActionButton[] => {
  if (isCanvas || !openCanvas) {
    return [];
  }
  return [
    {
      label: i18n.translate('xpack.synthetics.agentBuilder.monitor.previewActionLabel', {
        defaultMessage: 'Preview',
      }),
      icon: 'eye',
      type: ActionButtonType.SECONDARY,
      handler: () => {
        openCanvas();
      },
    },
  ];
};

interface BuildMonitorManagementUIDefinitionParams {
  http: HttpStart;
  application: ApplicationStart;
}

/**
 * Builds the `AttachmentUIDefinition` for the monitor-management
 * attachment, capturing the platform services it needs in a closure.
 *
 * Mirrors the dashboard_agent pattern (see `dashboard_agent/public/
 * attachment_types/index.tsx`): inline + canvas renderers are built
 * inside `addAttachmentType<T>(...)` so that core services (`http`,
 * `application.capabilities`, `application.getUrlForApp`,
 * `application.navigateToUrl`) are available to the canvas's Create /
 * Update / View buttons without prop-drilling through the framework.
 *
 * The registration of *the type* itself is small and synchronous —
 * the heavy modules (inline content, canvas content + actions) are
 * loaded lazily when an attachment of this type renders.
 */
export const buildMonitorManagementAttachmentUIDefinition = ({
  http,
  application,
}: BuildMonitorManagementUIDefinitionParams): AttachmentUIDefinition<MonitorAttachment> => {
  const renderCanvasContent = (
    props: AttachmentRenderProps<MonitorAttachment>,
    callbacks: CanvasRenderCallbacks
  ): React.ReactNode => {
    const { attachment } = props;
    if (!attachment.data) {
      return null;
    }
    return (
      <Suspense fallback={null}>
        <LazyMonitorManagementCanvasContent
          data={attachment.data}
          http={http}
          application={application}
          registerActionButtons={callbacks.registerActionButtons}
          updateOrigin={callbacks.updateOrigin}
          closeCanvas={callbacks.closeCanvas}
        />
      </Suspense>
    );
  };

  return {
    getLabel: getAttachmentLabel,
    getIcon: () => 'uptimeApp',
    renderInlineContent,
    renderCanvasContent,
    getActionButtons,
    canvasWidth: '40vw',
  };
};

export interface RegisterMonitorManagementAttachmentParams {
  attachmentService: AttachmentServiceStartContract;
  http: HttpStart;
  application: ApplicationStart;
}

/**
 * Register the attachment UI definition with the agent_builder browser
 * attachment service.
 *
 * Idempotent at the framework level — the service keeps the most
 * recent registration. Caller is `bindAgentBuilderOnStart`, which is
 * itself called from `public/plugin.ts`'s `start()` once `coreStart`
 * + `pluginsStart` are available.
 */
export const registerMonitorManagementAttachmentUIDefinition = ({
  attachmentService,
  http,
  application,
}: RegisterMonitorManagementAttachmentParams): void => {
  attachmentService.addAttachmentType<MonitorAttachment>(
    MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
    buildMonitorManagementAttachmentUIDefinition({ http, application })
  );
};
