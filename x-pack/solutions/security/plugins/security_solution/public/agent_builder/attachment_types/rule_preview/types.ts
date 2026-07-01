/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { SecurityAppStore } from '../../../common/store/types';
import type { StartServices } from '../../../types';

export interface RulePreviewAttachmentData {
  previewId: string;
  attachmentLabel?: string;
}

export type RulePreviewAttachment = Attachment<
  SecurityAgentBuilderAttachments.rulePreview,
  RulePreviewAttachmentData
>;

export interface PreviewMetadataState {
  total: number;
  ruleType: Type;
  timeframeStart: Moment;
  timeframeEnd: Moment;
}

export interface RulePreviewAttachmentServices {
  data: DataPublicPluginStart;
  spaces: SpacesPluginStart;
  getServices: () => Promise<StartServices>;
  getStore: () => Promise<SecurityAppStore>;
}
