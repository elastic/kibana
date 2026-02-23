/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';

evaluate.describe('Security Cases Skill', { tag: '@local-stateful-security_complete' }, () => {
  evaluate.beforeAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate.afterAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate('case creation intent', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security-cases: creation',
        description:
          'Validates the agent identifies case creation intent and routes to the security.cases tool',
        examples: [
          {
            input: {
              question:
                'Create a new security case for suspicious login activity from IP 192.168.1.100 with high severity.',
            },
            output: {
              expected:
                'The agent should load the security cases skill, then attempt to create a case using the security.cases tool with the create_case operation. It should draft a title and description based on the suspicious login activity, set severity to high, and ask the user for explicit confirmation before proceeding with confirm: true.',
            },
            metadata: {
              expectedOnlyToolId: 'security.cases',
              query_intent: 'Action',
            },
          },
          {
            input: {
              question:
                'I need a case created to track the phishing campaign targeting our finance team. Tag it with "phishing" and "finance".',
            },
            output: {
              expected:
                'The agent should use the security.cases tool with create_case operation. It should include "phishing" and "finance" as tags, draft an appropriate title and description about the phishing campaign targeting the finance team, and request user confirmation before executing.',
            },
            metadata: {
              expectedOnlyToolId: 'security.cases',
              query_intent: 'Action',
            },
          },
        ],
      },
    });
  });

  evaluate('case update and comment', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security-cases: update and comment',
        description:
          'Validates the agent handles case update and comment operations via security.cases tool',
        examples: [
          {
            input: {
              question:
                'Update case abc-123 status to in-progress and change the severity to critical.',
            },
            output: {
              expected:
                'The agent should use the security.cases tool with the update_case operation targeting case id "abc-123". It should set status to "in-progress" and severity to "critical", then ask the user for confirmation before executing with confirm: true.',
            },
            metadata: {
              expectedOnlyToolId: 'security.cases',
              query_intent: 'Action',
            },
          },
          {
            input: {
              question:
                'Add a comment to case abc-123 saying "Investigated the alert - confirmed as a true positive. Escalating to incident response team."',
            },
            output: {
              expected:
                'The agent should use the security.cases tool with the add_comment operation for case id "abc-123". The comment should be passed as a markdown string. The agent must ask for user confirmation before proceeding.',
            },
            metadata: {
              expectedOnlyToolId: 'security.cases',
              query_intent: 'Action',
            },
          },
        ],
      },
    });
  });

  evaluate('confirmation workflow', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security-cases: confirmation workflow',
        description:
          'Validates the agent follows the safe workflow of restating changes and requesting confirmation',
        examples: [
          {
            input: {
              question: 'Close case def-456 and add a closing comment that the issue was resolved.',
            },
            output: {
              expected:
                'The agent should recognize this requires two operations on case def-456: updating the status to "closed" and adding a closing comment. Before executing either operation, the agent should restate the intended changes and request explicit user confirmation. It should use the security.cases tool for both operations.',
            },
            metadata: {
              expectedOnlyToolId: 'security.cases',
              query_intent: 'Action',
            },
          },
        ],
      },
    });
  });
});
