/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  KI_FEATURE_ATTACHMENT_TYPE,
  type SignificantEventDetectionAttachment,
  type KiFeatureAttachment,
} from '@kbn/significant-events-plugin/common';

const significantEventDetectionAttachmentDefinition: AttachmentUIDefinition<SignificantEventDetectionAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data.rule_name ??
      i18n.translate('xpack.observability.nightshift.detectionAttachment.fallbackLabel', {
        defaultMessage: 'Detection',
      }),
    getIcon: () => 'bell',
    getHeader: () => ({
      icon: 'bell',
      subtitle: i18n.translate('xpack.observability.nightshift.detectionAttachment.subtitle', {
        defaultMessage: 'Significant Events detection',
      }),
    }),
  };

const kiFeatureAttachmentDefinition: AttachmentUIDefinition<KiFeatureAttachment> = {
  getLabel: (attachment) =>
    attachment.data.title ??
    attachment.data.id ??
    i18n.translate('xpack.observability.nightshift.featureAttachment.fallbackLabel', {
      defaultMessage: 'Entity',
    }),
  getIcon: () => 'node',
  getHeader: () => ({
    icon: 'node',
    subtitle: i18n.translate('xpack.observability.nightshift.featureAttachment.subtitle', {
      defaultMessage: 'Knowledge indicator feature',
    }),
  }),
};

export const registerNightshiftAgentBuilderAttachments = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginStart;
}): void => {
  agentBuilder.attachments.addAttachmentType(
    KI_FEATURE_ATTACHMENT_TYPE,
    kiFeatureAttachmentDefinition
  );
  agentBuilder.attachments.addAttachmentType(
    SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
    significantEventDetectionAttachmentDefinition
  );
};
