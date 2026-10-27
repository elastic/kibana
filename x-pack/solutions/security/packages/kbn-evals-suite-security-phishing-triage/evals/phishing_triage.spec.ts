/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { createVerdictReturnedEvaluator } from '../src/verdict_returned_evaluator';
import type { PhishingTriageOutput } from '../src/verdict_returned_evaluator';

const EMAILS = [
  'Your mailbox is full. Verify your password at http://mail-quota-check.example.net to avoid suspension.',
  'Urgent: invoice 88213 overdue. Open the attached .html file and sign in to review the payment.',
  'IT helpdesk: your VPN token expires today. Re-enter your credentials at http://vpn-renew.example.org.',
  'CEO request: buy gift cards for a client and reply with the codes. Do not call me, I am in a meeting.',
];

evaluate.describe('phishing triage', { tag: tags.stateful.classic }, () => {
  evaluate('classifies reported emails', async ({ executorClient, fetch }) => {
    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: 'phishing triage: reported emails',
            description: 'Emails reported by users as suspicious',
            examples: EMAILS.map((body) => ({
              input: { body },
              output: { verdict: 'malicious' },
            })),
          },
        ],
        task: async ({ input }): Promise<PhishingTriageOutput> => {
          const response = await fetch('/internal/security/phishing_triage', {
            method: 'POST',
            body: JSON.stringify({ body: input.body }),
          });
          return (await response.json()) as PhishingTriageOutput;
        },
      },
      [createVerdictReturnedEvaluator()]
    );
  });
});
