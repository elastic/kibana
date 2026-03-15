/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAzureConnector } from '../../../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { setPreferredChatExperienceToAgent } from '../../../../tasks/api_calls/kibana_advanced_settings';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  openCreateRuleMenu,
  clickAiRuleCreationMenuItem,
  assertAgentBuilderSidebarIsOpen,
  assertAgentBuilderConversationInputEditorContains,
} from '../../../../tasks/agent_builder';
import {
  CREATE_RULE_BUTTON,
  AI_RULE_CREATION_MENU_ITEM,
  MANUAL_RULE_CREATION_MENU_ITEM,
} from '../../../../screens/agent_builder';

describe(
  'AI Rule Creation via Agent Builder',
  {
    tags: ['@serverless', '@ess', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'aiRuleCreationEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      deleteConnectors();
      login();
      createAzureConnector();
      setPreferredChatExperienceToAgent();
      visitRulesManagementTable();
    });

    it('should display the "Create a rule" dropdown with AI and Manual options', () => {
      cy.get(CREATE_RULE_BUTTON).should('be.visible');
      openCreateRuleMenu();
      cy.get(AI_RULE_CREATION_MENU_ITEM).should('be.visible');
      cy.get(MANUAL_RULE_CREATION_MENU_ITEM).should('be.visible');
    });

    it('should open Agent Builder sidebar with pre-populated prompt when clicking "AI rule creation"', () => {
      openCreateRuleMenu();
      clickAiRuleCreationMenuItem();

      assertAgentBuilderSidebarIsOpen();
      assertAgentBuilderConversationInputEditorContains('ES|QL SIEM detection rule');
    });
  }
);
