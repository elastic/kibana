/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  MONITOR_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../common/agent_builder/attachments/monitor_attachment_schema';
import { MonitorInlineContent } from './monitor_inline_content';

export { MONITOR_ATTACHMENT_TYPE };

export type MonitorAttachment = Attachment<typeof MONITOR_ATTACHMENT_TYPE, MonitorAttachmentData>;

export const createMonitorAttachmentDefinition = (): AttachmentUIDefinition<MonitorAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'globe',
  renderInlineContent: (props) => <MonitorInlineContent {...props} />,
});
