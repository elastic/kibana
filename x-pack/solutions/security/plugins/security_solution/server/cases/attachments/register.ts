/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesServerSetup } from '@kbn/cases-plugin/server';

import { getEndpointAttachmentType } from './endpoint';
import { getEventAttachmentType } from './event';
import { getIndicatorAttachmentType } from './indicator';
import { getTimelineAttachmentType } from './timeline';

export const registerCaseAttachments = (
  attachmentFramework: CasesServerSetup['attachmentFramework']
): void => {
  attachmentFramework.registerUnified(getEndpointAttachmentType());
  attachmentFramework.registerUnified(getEventAttachmentType());
  attachmentFramework.registerUnified(getIndicatorAttachmentType());
  attachmentFramework.registerUnified(getTimelineAttachmentType());
};
