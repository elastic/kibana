/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  ALERTZERO_ENABLED_SETTING_ID,
  TEMPLATE_ID_ESCALATION,
  TEMPLATE_ID_INVESTIGATION,
} from '@kbn/alertzero-common';
import type { ActionsService } from '../services/actions/actions_service';
import { registerAgentType } from '../agent';
import { isSpaceSupported } from '../lib/is_space_supported';
import { listActionsTool } from '../agent_builder_tools/list_actions_tool';
import type { AssertAlertZeroAccess } from '../agent_builder_tools/assert_alertzero_access';
import { createActionDiscoverySkill } from './skills/action_discovery';
import { registerAttachments } from './attachments/register_attachments';

/** What Kibana's `server` entry and the task pod's tasks entry each provide to the registration. */
export interface AlertZeroAgentBuilderDeps {
  agentBuilder: Pick<
    AgentBuilderPluginSetup,
    'agents' | 'attachments' | 'tools' | 'skills' | 'conversations'
  >;
  assertAlertZeroAccess: AssertAlertZeroAccess;
  getActionsService: () => Pick<ActionsService, 'list'>;
  /** Whether the space of the request has AlertZero on; gates `ai.conversation.updated`. */
  isConversationUpdatedEnabled: (request: KibanaRequest) => Promise<boolean>;
}

/**
 * The agent builder side of AlertZero: the thin agent type, the attachment types, the actions tool,
 * the action discovery skill and the opt-in to `ai.conversation.updated`. Both the plugin's `server`
 * entry and its tasks entry register through this.
 */
export const registerAlertZeroAgentBuilderContributions = ({
  agentBuilder,
  assertAlertZeroAccess,
  getActionsService,
  isConversationUpdatedEnabled,
}: AlertZeroAgentBuilderDeps): void => {
  registerAgentType(agentBuilder);
  registerAttachments(agentBuilder);
  // The handler resolves the service lazily like the routes do.
  agentBuilder.tools.register({
    ...listActionsTool(getActionsService, assertAlertZeroAccess),
  });
  agentBuilder.skills.register(createActionDiscoverySkill(assertAlertZeroAccess));
  // `ai.conversation.updated` is opt-in, so Agent Builder only emits it where a consumer
  // subscribes. Scoped per space, like the routes, so spaces without AlertZero, and Classic
  // spaces, stay quiet.
  agentBuilder.conversations.enableUpdatedTrigger({
    templateIds: [TEMPLATE_ID_INVESTIGATION, TEMPLATE_ID_ESCALATION],
    isEnabled: isConversationUpdatedEnabled,
  });
};

/** The `isEnabled` of the `ai.conversation.updated` opt-in, over lazily resolved services. */
export const makeIsConversationUpdatedEnabled =
  (
    getServices: () => Promise<{
      core: Pick<CoreStart, 'savedObjects' | 'uiSettings'>;
      spaces?: SpacesPluginStart;
      isServerless: boolean;
    }>
  ) =>
  async (request: KibanaRequest): Promise<boolean> => {
    const { core, spaces, isServerless } = await getServices();
    if (!(await isSpaceSupported({ isServerless, spaces, request }))) {
      return false;
    }
    return core.uiSettings
      .asScopedToClient(core.savedObjects.getScopedClient(request))
      .get<boolean>(ALERTZERO_ENABLED_SETTING_ID);
  };
