/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationsService } from './integrations/integrations_service';
import type { AgentFactory } from './orchestration';
import type { ConversationService } from './conversations';

export interface InternalServices {
  agentFactory: AgentFactory;
  conversationService: ConversationService;
  integrationsService: IntegrationsService;
}
