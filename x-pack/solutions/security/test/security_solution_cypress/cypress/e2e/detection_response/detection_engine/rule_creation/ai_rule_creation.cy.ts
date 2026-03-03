/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  visitAiRuleCreationPage,
  selectAiRuleCreation,
  submitRuleCreationPrompt,
  clickCancelButton,
  assertInfoCalloutVisible,
  assertProgressVisible,
  assertUpdatesVisible,
  assertPromptTextareaEnabled,
  assertRegenerateButtonVisible,
  assertCancelButtonVisible,
  assertConnectorSelected,
  clickBackToPromptLink,
  assertPromptTextareaContains,
  interceptAgentBuilderConverseAsync,
  clickNewAgentBuilderAttachmentButton,
  assertAgentBuilderConversationFlyoutVisible,
  assertAgentBuilderConversationInputEditorContains,
  assertEsqlQueryBarContains,
  assertCancelledCalloutVisible,
  assertPromptTextareaVisible,
} from '../../../../tasks/ai_rule_creation';
import { createAzureConnector } from '../../../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../../../tasks/api_calls/common';

import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  continueFromDefineStep,
  getAboutContinueButton,
  skipScheduleRuleAction,
  createRuleWithoutEnabling,
} from '../../../../tasks/create_new_rule';
import { azureConnectorAPIPayload } from '../../../../tasks/api_calls/connectors';
import { setPreferredChatExperienceToAgent } from '../../../../tasks/api_calls/kibana_advanced_settings';
import { ESQL_QUERY_DETAILS } from '../../../../screens/rule_details';
import { getDetails } from '../../../../tasks/rule_details';

const esqlQuery =
  'FROM *| WHERE destination.domain IS NULL| STATS total_bytes = SUM(network.bytes), event_count = COUNT(*) BY source.user.name, destination.ip| WHERE total_bytes > 104857600 OR event_count >= 100| LIMIT 100';

const mockChatResponse = `event: conversation_id_set
data: {"data":{"conversation_id":"bf175058-a0c6-40a0-ae58-68e29e0a0771"}}

event: reasoning
data: {"data":{"reasoning":"Thinking about my next action","transient":true}}

event: reasoning
data: {"data":{"reasoning":"The user provided a detailed detection scenario involving two conditions within a 2-hour window: (1) users transferring over 100 MB of data, or (2) users generating 100 or more events to a direct IP address (not a domain name). I will use this information to generate a detection rule that captures both conditions."}}

event: tool_call
data: {"data":{"tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb","tool_id":"security.create_detection_rule","params":{"user_query":"Detect users who, within a 2 hour interval window, either transfer over 100 MB of data or generate 100 or more events to a direct IP address (not a domain name)."}}}

event: tool_progress
data: {"data":{"message":"Generating ES|QL query from natural language...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

: keep-alive
event: tool_progress
data: {"data":{"message":"ES|QL query generated successfully","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Fetching available tags and selecting relevant ones...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Analyzing 189 available tags...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Selected 7 relevant tag(s)","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Generating rule name and description...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Rule name and description generated successfully","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Analyzing rule to identify relevant MITRE ATT&CK tactics and techniques...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Identified 1 MITRE ATT&CK mapping(s) with 1 technique(s)","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Computing rule schedule (interval and lookback period)...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Schedule computed: interval=2h, from=now-132m","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Adding default fields to rule...","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_progress
data: {"data":{"message":"Default fields added to rule","tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb"}}

event: tool_result
data: {"data":{"tool_call_id":"call_4BwywYrTSU9L5bHiicrg9hWb","tool_id":"security.create_detection_rule","results":[{"type":"other","data":{"success":true,"rule":{"query":"${esqlQuery}","language":"esql","type":"esql","tags":["Domain: Network","Data Source: Network","Data Source: Network Traffic","Data Source: Network Packet Capture","Use Case: Data Exfiltration Detection","Use Case: Network Security Monitoring","Tactic: Exfiltration","AI assisted rule creation"],"name":"High Data Transfer or Event Volume to Direct IP","description":"Detects users who, within a 2 hour window, either transfer over 100 MB of data or generate 100 or more events to a direct IP address (not a domain name).","threat":[{"framework":"MITRE ATT&CK","tactic":{"id":"TA0010","name":"Exfiltration","reference":"https://attack.mitre.org/tactics/TA0010/"},"technique":[{"id":"T1041","name":"Exfiltration Over C2 Channel","reference":"https://attack.mitre.org/techniques/T1041/"}]}],"interval":"2h","from":"now-132m","to":"now","references":[],"severity_mapping":[],"risk_score_mapping":[],"related_integrations":[],"required_fields":[],"actions":[],"exceptions_list":[],"false_positives":[],"author":[],"setup":"","max_signals":100,"risk_score":21,"severity":"low"}},"tool_result_id":"24hdDb"}]}}

event: reasoning
data: {"data":{"reasoning":"Summarizing my findings","transient":true}}

event: thinking_complete
data: {"data":{"time_to_first_token":18486}}`;

const userPrompt = 'Create a rule to detect suspicious login attempts';

// FLAKY: https://github.com/elastic/kibana/issues/253599
// FLAKY: https://github.com/elastic/kibana/issues/253600
// FLAKY: https://github.com/elastic/kibana/issues/253601
describe.skip(
  'AI Rule Creation',
  {
    // skipping in MKI due to feature flags
    tags: ['@serverless', '@ess', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        // to run these tests locally in dev mode, you need to add these feature flags in the Cypress ftr config
        // x-pack/solutions/security/test/security_solution_cypress/config.ts and x-pack/solutions/security/test/security_solution_cypress/serverless_config.ts
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
    });

    it('should open AI rule creation from the create rule menu', () => {
      visitRulesManagementTable();
      selectAiRuleCreation();
      assertInfoCalloutVisible();
      assertPromptTextareaVisible();
    });

    it('should generate a rule and save it', () => {
      interceptAgentBuilderConverseAsync({ mockResponse: mockChatResponse, delay: 3000 });

      visitAiRuleCreationPage();
      assertConnectorSelected(azureConnectorAPIPayload.name);

      submitRuleCreationPrompt(userPrompt);
      assertProgressVisible();
      assertUpdatesVisible();

      // ensure form with data is rendered
      assertEsqlQueryBarContains(esqlQuery);

      // save rule
      continueFromDefineStep();
      getAboutContinueButton().click();
      skipScheduleRuleAction();
      createRuleWithoutEnabling();

      // ensure rule details page is displayed and ES|QL query rendered
      getDetails(ESQL_QUERY_DETAILS).should('have.text', esqlQuery);
    });

    it('should add rule attachment to the chat', () => {
      interceptAgentBuilderConverseAsync({ mockResponse: mockChatResponse });

      visitAiRuleCreationPage();
      assertConnectorSelected(azureConnectorAPIPayload.name);
      submitRuleCreationPrompt(userPrompt);

      assertEsqlQueryBarContains(esqlQuery);

      clickNewAgentBuilderAttachmentButton();

      // Verify the agent builder conversation flyout opens
      assertAgentBuilderConversationFlyoutVisible();
      assertAgentBuilderConversationInputEditorContains(
        'Review the detection rule provided and help improve it'
      );
    });

    it('should generate a rule and allow to go back to the prompt', () => {
      interceptAgentBuilderConverseAsync({ mockResponse: mockChatResponse });

      visitAiRuleCreationPage();
      assertConnectorSelected(azureConnectorAPIPayload.name);
      submitRuleCreationPrompt(userPrompt);
      assertEsqlQueryBarContains(esqlQuery);

      // Check that the link back to the prompt exists and verify it still contains the previous prompt
      clickBackToPromptLink();
      assertPromptTextareaContains(userPrompt);
      assertUpdatesVisible();
    });

    it('should allow cancelling rule creation and show regenerate button', () => {
      visitAiRuleCreationPage();
      assertConnectorSelected(azureConnectorAPIPayload.name);
      submitRuleCreationPrompt(userPrompt);

      assertCancelButtonVisible();
      clickCancelButton();

      assertCancelledCalloutVisible();
      assertPromptTextareaEnabled();
      assertRegenerateButtonVisible();
    });
  }
);
