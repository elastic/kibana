/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsExample } from '../src/evaluate_dataset';

export const THREAT_DETECTION_EXAMPLES: EntityAnalyticsExample[] = [
  {
    input: {
      question: 'Are there privileged accounts with unusual command patterns?',
    },
    output: {
      criteria: [
        'Response addresses privileged accounts and command patterns.',
        'Response refers to privilege or elevated access and command/execution behavior.',
        'Response identifies unusual or anomalous patterns.',
      ],
    },
  },
  {
    input: {
      question: 'Show users logged in from multiple locations',
    },
    output: {
      criteria: [
        'Response addresses users who logged in from multiple locations.',
        'Response uses or suggests geo/location data (e.g. source.geo.country_iso_code or source.geo.city_name) and user identity.',
        'Response identifies users with more than one distinct location.',
      ],
      // No expectedEsql: multiple valid formulations (country vs city, different index patterns, auth filter) are acceptable.
    },
  },
  {
    input: {
      question: 'Are there connections suggesting lateral movement?',
    },
    output: {
      criteria: [
        'Response addresses lateral movement or connections that may suggest it.',
        'Response refers to network connections, hosts, or authentication patterns across systems.',
        'Response is relevant to entity or host behavior analysis.',
      ],
    },
  },
  {
    input: {
      question: 'Show users who downloaded unusually large data',
    },
    output: {
      criteria: [
        'Response addresses users and data download volume.',
        'Response refers to large or unusual download amounts.',
        'Response identifies or suggests how to find such users.',
      ],
    },
  },
  {
    input: {
      question: 'Which users uploaded data to external domains?',
    },
    output: {
      criteria: [
        'Response addresses users and uploads to external domains.',
        'Response refers to destination (external) and upload/transfer activity.',
        'Response identifies or suggests how to find such users.',
      ],
    },
  },
  {
    input: {
      question: 'Show accounts performing unusual administrative actions',
    },
    output: {
      criteria: [
        'Response addresses accounts and administrative actions.',
        'Response refers to admin or privileged actions and unusual behavior.',
        'Response is relevant to entity analytics or security investigation.',
      ],
    },
  },
  {
    input: {
      question: 'Show unusual access attempts to privileged accounts',
    },
    output: {
      criteria: [
        'Response addresses access attempts to privileged accounts.',
        'Response refers to privilege, authentication, or access attempts.',
        'Response identifies unusual or suspicious attempts.',
      ],
    },
  },
  {
    input: {
      question: 'Show me users with suspicious login patterns',
    },
    output: {
      criteria: [
        'Response addresses users and login patterns.',
        'Response refers to authentication or login behavior.',
        'Response identifies or suggests suspicious patterns.',
      ],
    },
  },
  {
    input: {
      question: 'Are there any unusual access patterns after hours?',
    },
    output: {
      criteria: [
        'Response addresses access patterns outside normal hours.',
        'Response constrains or refers to time (after hours / off-hours).',
        'Response refers to access or activity patterns.',
      ],
    },
  },
  {
    input: {
      question: 'Which accounts have downloaded more than 1GB this week?',
    },
    output: {
      criteria: [
        'Response addresses accounts and download volume (e.g. 1GB or more).',
        'Response constrains time to this week.',
        'Response identifies or suggests how to find such accounts.',
      ],
    },
  },
  {
    input: {
      question: 'Is anyone accessing sensitive data from new locations?',
    },
    output: {
      criteria: [
        'Response addresses access to sensitive data and location.',
        'Response refers to new or changed locations (geo).',
        'Response is relevant to entity or data access analysis.',
      ],
    },
  },
];

export const THREAT_DETECTION_DATASET = {
  name: 'entity-analytics: threat detection and other',
  description:
    'Behavioral analysis, lateral movement, data exfiltration, privilege escalation, and other entity analytics questions.',
  examples: THREAT_DETECTION_EXAMPLES,
};
