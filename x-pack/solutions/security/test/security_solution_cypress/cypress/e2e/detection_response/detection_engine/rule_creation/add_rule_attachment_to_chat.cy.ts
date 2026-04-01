/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { createRule } from '../../../../tasks/api_calls/rules';
import { createAzureConnector } from '../../../../tasks/api_calls/connectors';
import { deleteAlertsAndRules, deleteConnectors } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { visitRuleEditPage } from '../../../../tasks/edit_rule';
import { setPreferredChatExperienceToAgent } from '../../../../tasks/api_calls/kibana_advanced_settings';
import {
  clickNewAgentBuilderAttachmentButton,
  assertAgentBuilderConversationInputEditorContains,
} from '../../../../tasks/ai_rule_creation';
import { NEW_AGENT_BUILDER_ATTACHMENT_BUTTON } from '../../../../screens/ai_rule_creation';

const prompt = 'Analyze the attached Security detection rule and provide actionable insights.';

describe(
  'Add rule attachment to chat button',
  {
    tags: ['@serverless', '@ess'],
  },
  () => {
    beforeEach(() => {
      deleteConnectors();
      deleteAlertsAndRules();
      login();
      createAzureConnector();
      setPreferredChatExperienceToAgent();
    });

    it('should show the "Add to chat" button on the rule creation page', () => {
      visit(CREATE_RULE_URL);

      cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible');
      clickNewAgentBuilderAttachmentButton();
      assertAgentBuilderConversationInputEditorContains(prompt);
    });

    it('should show the "Add to chat" button on the rule details page', () => {
      createRule(
        getCustomQueryRuleParams({ rule_id: 'test-rule', name: 'Test Rule', enabled: false })
      ).then((response) => {
        visitRuleDetailsPage(response.body.id);
      });

      cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible');
      clickNewAgentBuilderAttachmentButton();
      assertAgentBuilderConversationInputEditorContains(prompt);
    });

    it('should show the "Add to chat" button on the rule editing page', () => {
      createRule(
        getCustomQueryRuleParams({ rule_id: 'test-rule', name: 'Test Rule', enabled: false })
      ).then((response) => {
        visitRuleEditPage(response.body.id);
      });

      cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible');
      clickNewAgentBuilderAttachmentButton();
      assertAgentBuilderConversationInputEditorContains(prompt);
    });
  }
);
