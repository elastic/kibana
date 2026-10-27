/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ChromeStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  KI_FEATURE_ATTACHMENT_TYPE,
  SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  type KiFeatureAttachment,
  type SignificantEventAttachment,
  type SignificantEventDetectionAttachment,
} from '@kbn/significant-events-plugin/common';
import type { FocusedSignificantEventService } from '../focused_significant_event_service';
import {
  getStatusColor,
  SIGNIFICANT_EVENT_STATUS_LABELS,
} from '../../components/entities/significant_event/significant_event_status';
import { registerSignificantEventAutoAttach } from './significant_event_auto_attach';
import { SignificantEventCanvas } from './significant_event_canvas';

const labels = {
  fallback: i18n.translate('xpack.nightshift.significantEventAttachment.fallbackLabel', {
    defaultMessage: 'Significant event',
  }),
  open: i18n.translate('xpack.nightshift.significantEventAttachment.openButton', {
    defaultMessage: 'Open preview',
  }),
};

const significantEventDetectionAttachmentDefinition: AttachmentUIDefinition<SignificantEventDetectionAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data.rule_name ??
      i18n.translate('xpack.nightshift.detectionAttachment.fallbackLabel', {
        defaultMessage: 'Detection',
      }),
    getIcon: () => 'bell',
    getHeader: () => ({
      icon: 'bell',
      subtitle: i18n.translate('xpack.nightshift.detectionAttachment.subtitle', {
        defaultMessage: 'Significant events detection',
      }),
    }),
  };

const kiFeatureAttachmentDefinition: AttachmentUIDefinition<KiFeatureAttachment> = {
  getLabel: (attachment) =>
    attachment.data.title ??
    attachment.data.id ??
    i18n.translate('xpack.nightshift.featureAttachment.fallbackLabel', {
      defaultMessage: 'Entity',
    }),
  getIcon: () => 'vectorTriangle',
  getHeader: () => ({
    icon: 'vectorTriangle',
    subtitle: i18n.translate('xpack.nightshift.featureAttachment.subtitle', {
      defaultMessage: 'Knowledge indicator feature',
    }),
  }),
};

export const createSignificantEventAttachmentDefinition = ({
  share,
}: {
  share: SharePluginStart;
}): AttachmentUIDefinition<SignificantEventAttachment> => ({
  getLabel: (attachment) => attachment.data.title || labels.fallback,
  getIcon: () => 'significantEvents',
  getHeader: ({ attachment }) => ({
    icon: 'significantEvents',
    subtitle: labels.fallback,
    badges: [
      {
        label:
          SIGNIFICANT_EVENT_STATUS_LABELS[attachment.data.status] ?? attachment.data.status,
        color: getStatusColor(attachment.data.status),
      },
    ],
  }),
  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas || !openCanvas) {
      return [];
    }

    return [
      {
        label: labels.open,
        type: ActionButtonType.SECONDARY,
        icon: 'eye',
        handler: openCanvas,
      },
    ];
  },
  renderCanvasContent: ({ attachment }) => (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <SignificantEventCanvas event={attachment.data} share={share} />
    </EuiPanel>
  ),
});

export const registerNightshiftAgentBuilderAttachments = ({
  agentBuilder,
  chrome,
  share,
  focusedSignificantEventService,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  share: SharePluginStart;
  focusedSignificantEventService: FocusedSignificantEventService;
  logger: Logger;
}): (() => void) => {
  // addAttachmentType throws on a duplicate; isolate each call so one failure can't skip the rest.
  const register = (type: string, add: () => void) => {
    try {
      add();
    } catch (error) {
      logger.error(`Failed to register the ${type} attachment type: ${error}`);
    }
  };

  register(KI_FEATURE_ATTACHMENT_TYPE, () =>
    agentBuilder.attachments.addAttachmentType(
      KI_FEATURE_ATTACHMENT_TYPE,
      kiFeatureAttachmentDefinition
    )
  );
  register(SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE, () =>
    agentBuilder.attachments.addAttachmentType(
      SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
      significantEventDetectionAttachmentDefinition
    )
  );
  register(SIGNIFICANT_EVENT_ATTACHMENT_TYPE, () =>
    agentBuilder.attachments.addAttachmentType(
      SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
      createSignificantEventAttachmentDefinition({ share })
    )
  );

  return registerSignificantEventAutoAttach({
    agentBuilder,
    chrome,
    focusedSignificantEventService,
  });
};
