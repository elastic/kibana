/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { InvestigationLocatorDefinition } from '../common/locators';
import {
  createNightshiftInvestigationsRepositoryClient,
  type NightshiftInvestigationsRepositoryClient,
} from './api';
import { registerInvestigationsWorkflowTriggers } from './workflows/triggers';
import { registerDecisionTreeAttachmentType } from './attachments/decision_tree_attachment';

export interface NightshiftInvestigationsPublicSetupDeps {
  share: SharePluginSetup;
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

export interface NightshiftInvestigationsPublicStartDeps {
  share: SharePluginStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export type NightshiftInvestigationsPublicSetup = void;

export interface NightshiftInvestigationsPublicStart {
  investigationsClient: NightshiftInvestigationsRepositoryClient;
}

export class NightshiftInvestigationsPublicPlugin
  implements
    Plugin<
      NightshiftInvestigationsPublicSetup,
      NightshiftInvestigationsPublicStart,
      NightshiftInvestigationsPublicSetupDeps,
      NightshiftInvestigationsPublicStartDeps
    >
{
  setup(
    _core: CoreSetup,
    { share, workflowsExtensions }: NightshiftInvestigationsPublicSetupDeps
  ): NightshiftInvestigationsPublicSetup {
    registerInvestigationsWorkflowTriggers(workflowsExtensions);

    share.url.locators.create(new InvestigationLocatorDefinition());
  }

  start(
    core: CoreStart,
    { share, agentBuilder }: NightshiftInvestigationsPublicStartDeps
  ): NightshiftInvestigationsPublicStart {
    if (agentBuilder) {
      registerDecisionTreeAttachmentType({ agentBuilder, application: core.application, share });
    }
    return {
      investigationsClient: createNightshiftInvestigationsRepositoryClient(core),
    };
  }
}
