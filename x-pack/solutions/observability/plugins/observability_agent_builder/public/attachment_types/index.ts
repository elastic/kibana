/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
} from '../../common/constants';

type UnknownAttachmentWithLabel = Attachment<
  string,
  { attachmentLabel?: string } & Record<string, unknown>
>;

interface AttachmentTypeConfig {
  type: string;
  label: string;
  icon: string;
}

const ATTACHMENT_TYPE_CONFIGS: AttachmentTypeConfig[] = [
  {
    type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
    label: i18n.translate('xpack.observabilityAgentBuilder.attachments.aiInsight.label', {
      defaultMessage: 'Summary',
    }),
    icon: 'sparkles',
  },
  {
    type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
    label: i18n.translate('xpack.observabilityAgentBuilder.attachments.alert.label', {
      defaultMessage: 'Observability alert',
    }),
    icon: 'warning',
  },
  {
    type: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
    label: i18n.translate('xpack.observabilityAgentBuilder.attachments.error.label', {
      defaultMessage: 'APM error',
    }),
    icon: 'bug',
  },
  {
    type: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
    label: i18n.translate('xpack.observabilityAgentBuilder.attachments.log.label', {
      defaultMessage: 'Log entry',
    }),
    icon: 'logPatternAnalysis',
  },
];

const createAttachmentTypeConfig = (defaultLabel: string, icon: string) => ({
  getLabel: (attachment: UnknownAttachmentWithLabel) => {
    const attachmentLabel = attachment?.data?.attachmentLabel;
    return attachmentLabel ?? defaultLabel;
  },
  getIcon: () => icon,
});

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  ATTACHMENT_TYPE_CONFIGS.forEach(({ type, label, icon }) => {
    attachments.addAttachmentType<UnknownAttachmentWithLabel>(
      type,
      createAttachmentTypeConfig(label, icon)
    );
  });
};
