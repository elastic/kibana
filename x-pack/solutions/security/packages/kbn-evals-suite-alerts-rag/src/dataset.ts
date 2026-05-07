/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertsRagExample {
  input: string;
  expected: { reference: string };
  metadata?: { dataset_split?: string[] };
}

/**
 * 6 examples exported from LangSmith dataset "Alerts RAG Regression (Episodes 1-8)"
 * (id: bd5bba1d-97aa-4512-bce7-b09aa943c651, exported 2026-05-07)
 *
 * These test the Security AI Assistant's ability to retrieve and reason about
 * alert data via RAG. Each question requires the assistant to query open alerts
 * and produce a factually correct response grounded in the retrieved context.
 */
export const alertsRagDataset: AlertsRagExample[] = [
  {
    input: 'How many open alerts do I have?',
    expected: {
      reference: 'There is a total of 95 open alerts.',
    },
    metadata: { dataset_split: ['base'] },
  },
  {
    input: 'How many critical severity alerts are there?',
    expected: {
      reference: 'There are 85 critical severity alerts in your environment.',
    },
    metadata: { dataset_split: ['base'] },
  },
  {
    input: 'How many high severity alerts are there?',
    expected: {
      reference: 'There are 10 high severity alerts in your environment.',
    },
    metadata: { dataset_split: ['base'] },
  },
  {
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference: 'The user name "Administrator" is mentioned the most in the open alerts.',
    },
    metadata: { dataset_split: ['base'] },
  },
  {
    input: 'Which alerts should I look at first?',
    expected: {
      reference: `Based on the alert counts from the last 24 hours, I recommend focusing on the critical alerts first.\nGiven this information, you should prioritize your attention as follows:\n\n1. Start with the critical alerts. These pose the highest risk to your environment and require immediate attention.\n2. After addressing the critical alerts, move on to the high severity alerts.`,
    },
    metadata: { dataset_split: ['base'] },
  },
  {
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference: `Based on the data provided, here's a summary of the hosts affected by open alerts:\n\n1. SRVMAC08\n2. SRVWIN07\n3. SRVWIN06\n4. SRVNIX05\n5. SRVWIN04\n6. SRVWIN03\n7. SRVWIN02\n8. SRVWIN01\n\nAdditionally, there are some hosts with the "-PRIV" suffix, which appear to be related to prevention alerts:\n\n9. SRVMAC08-PRIV\n10. SRVWIN06-PRIV\n11. SRVWIN04-PRIV\n12. SRVWIN03-PRIV\n13. SRVWIN02-PRIV\n14. SRVWIN01-PRIV\n\nThese hosts are affected by various types of malware, suspicious activities, and potential security threats as indicated by the alerts.`,
    },
    metadata: { dataset_split: ['base'] },
  },
];
