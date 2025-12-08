/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/onechat-browser';
import type { UnknownAttachment } from '@kbn/onechat-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  attachments.addAttachmentType<UnknownAttachment>(
    SecurityAgentBuilderAttachments.alert,
    {
      getLabel: () =>
        i18n.translate('xpack.securitySolution.agentBuilder.attachments.alert.label', {
          defaultMessage: 'Security Alert',
        }),
      getIcon: () => 'bell',
    }
  );

  attachments.addAttachmentType<UnknownAttachment>(
    SecurityAgentBuilderAttachments.entity,
    {
      getLabel: () =>
        i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.label', {
          defaultMessage: 'Risk Entity',
        }),
      getIcon: () => 'user',
    }
  );

  attachments.addAttachmentType<UnknownAttachment>(
    SecurityAgentBuilderAttachments.rule,
    {
      getLabel: () =>
        i18n.translate('xpack.securitySolution.agentBuilder.attachments.rule.label', {
          defaultMessage: 'Security Rule',
        }),
      getIcon: () => 'document',
    }
  );
};

