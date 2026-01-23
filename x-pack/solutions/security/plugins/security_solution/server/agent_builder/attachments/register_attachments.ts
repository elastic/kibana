/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { createRuleAttachmentType } from './rule';
import { createAlertAttachmentType } from './alert';
import { createEntityAttachmentType } from './entity';

/**
 * Registers all security agent builder attachments with the onechat plugin
 */
export const registerAttachments = async (onechat: OnechatPluginSetup) => {
  onechat.attachments.registerType(createAlertAttachmentType());
  onechat.attachments.registerType(createEntityAttachmentType());
  onechat.attachments.registerType(createRuleAttachmentType());
};
