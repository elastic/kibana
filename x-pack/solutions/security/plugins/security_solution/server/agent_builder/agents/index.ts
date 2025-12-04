/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { createEntityAgent } from './entity_agent';
import { createAlertsAgent } from './alerts_agent';

/**
 * Registers all security agent builder tools with the onechat plugin
 */
export const registerAgents = async (onechat: OnechatPluginSetup) => {
  onechat.agents.register(createAlertsAgent());
  onechat.agents.register(createEntityAgent());
};
