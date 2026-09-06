/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toKiFeatureViewSpec, toSigEventDetectionViewSpec } from '@kbn/adaptive-ui-adapters';
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
      i18n.translate('xpack.nightshift.detectionAttachment.fallbackLabel', {
        defaultMessage: 'Detection',
      }),
    getIcon: () => 'bell',
    getHeader: () => ({
      icon: 'bell',
      subtitle: i18n.translate('xpack.nightshift.detectionAttachment.subtitle', {
        defaultMessage: 'Significant Events detection',
      }),
    }),
    getViewSpec: ({ data }) =>
      toSigEventDetectionViewSpec({
        rule_name: data.rule_name,
        stream_name: data.stream_name,
        change_point_type: data.change_point_type,
        timestamp: data['@timestamp'],
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
  getViewSpec: ({ data }) =>
    toKiFeatureViewSpec({
      name: data.title ?? data.id,
      type: data.type,
      subtype: data.subtype,
      description: data.description,
      stream_name: data.stream_name,
      confidence: data.confidence,
      tags: data.tags,
      filter: data.filter === undefined ? undefined : JSON.stringify(data.filter),
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
