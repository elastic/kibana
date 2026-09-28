/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { ExceptionInlineContent } from './exception_inline_content';
import type { ExceptionAttachment } from './types';

export const createExceptionAttachmentDefinition =
  (): AttachmentUIDefinition<ExceptionAttachment> => ({
    getLabel: (attachment) =>
      attachment.data.attachmentLabel ??
      attachment.data.name ??
      i18n.translate('xpack.securitySolution.agentBuilder.exceptionAttachment.label', {
        defaultMessage: 'Rule exception',
      }),
    getIcon: () => 'filterExclude',
    renderInlineContent: (props) => <ExceptionInlineContent {...props} />,
  });

export const registerExceptionAttachment = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.exception,
    createExceptionAttachmentDefinition()
  );
};
