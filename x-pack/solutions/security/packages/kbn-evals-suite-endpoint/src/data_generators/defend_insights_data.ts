/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointScenario } from './endpoint_data';
import { DEFEND_INSIGHTS_AGENT_ID_PREFIX } from './cleanup';
import type { DefendInsightsExpectedOutput } from '../defend_insights/types';

const FILE_EVENTS_INDEX = 'logs-endpoint.events.file-default';
const WINDOWS_OS = { name: 'Windows', version: '10', type: 'windows', full: 'Windows 10' };

const AVAST_SVC = 'C:\\Program Files\\Avast Software\\Avast\\AvastSvc.exe';
const AVAST_UI = 'C:\\Program Files\\Avast Software\\Avast\\AvastUI.exe';
const KASPERSKY_AVP = 'C:\\Program Files (x86)\\Kaspersky Lab\\Kaspersky Total Security\\avp.exe';
const MALWAREBYTES_SVC = 'C:\\Program Files\\Malwarebytes\\Anti-Malware\\MBAMService.exe';

const BENIGN_PATHS = [
  'C:\\Windows\\explorer.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Elastic\\Endpoint\\elastic-endpoint.exe',
  'C:\\Program Files\\Elastic\\Agent\\elastic-agent.exe',
];

const fileEventDocument = (
  agentId: string,
  hostName: string,
  executable: string,
  index: number
) => ({
  index: FILE_EVENTS_INDEX,
  document: {
    agent: { id: agentId, type: 'endpoint' },
    host: { name: hostName, os: WINDOWS_OS },
    event: { category: ['file'], type: ['change'], action: 'overwrite', kind: 'event' },
    data_stream: { type: 'logs', dataset: 'endpoint.events.file', namespace: 'default' },
    file: {
      path: `C:\\Users\\eval\\AppData\\Local\\Temp\\eval-${index}.tmp`,
      name: `eval-${index}.tmp`,
    },
    process: { pid: 4000 + index, name: executable.split('\\').pop(), executable },
  },
});

const buildScenario = (
  slug: string,
  executables: string[]
): EndpointScenario & { agentId: string } => {
  const agentId = `${DEFEND_INSIGHTS_AGENT_ID_PREFIX}${slug}`;
  const hostName = `eval-host-di-${slug}`;
  return {
    agentId,
    hostName,
    os: WINDOWS_OS,
    policyName: 'eval-policy-di',
    policyStatus: 'success',
    agentPackages: ['endpoint'],
    extraDocuments: executables.map((executable, i) =>
      fileEventDocument(agentId, hostName, executable, i)
    ),
  };
};

export interface DefendInsightsDatasetCase {
  name: string;
  description: string;
  scenario: EndpointScenario;
  expected: DefendInsightsExpectedOutput;
}

/**
 * Each case owns one agent id so retrieval (`terms agent.id`) only sees that case's events.
 * Expected paths use real product directories, matching what the AV prompt keeps.
 */
export const DEFEND_INSIGHTS_CASES: DefendInsightsDatasetCase[] = [
  {
    name: 'av-conflict',
    description:
      'Two third-party AV products mixed with benign executables: expect one group each.',
    scenario: buildScenario('av-conflict', [AVAST_SVC, AVAST_UI, KASPERSKY_AVP, ...BENIGN_PATHS]),
    expected: {
      results: [
        {
          name: 'Avast',
          requiredPaths: [AVAST_SVC],
          optionalPaths: [AVAST_UI],
          excludedPaths: BENIGN_PATHS,
        },
        {
          name: 'Kaspersky',
          requiredPaths: [KASPERSKY_AVP],
          optionalPaths: [],
          excludedPaths: BENIGN_PATHS,
        },
      ],
    },
  },
  {
    name: 'single-av',
    description: 'One AV product mixed with benign executables: expect exactly one group.',
    scenario: buildScenario('single-av', [MALWAREBYTES_SVC, ...BENIGN_PATHS]),
    expected: {
      results: [
        {
          name: 'Malwarebytes',
          requiredPaths: [MALWAREBYTES_SVC],
          optionalPaths: [],
          excludedPaths: BENIGN_PATHS,
        },
      ],
    },
  },
  {
    name: 'clean-host',
    description: 'Negative control: only benign and Elastic executables, expect no AV group.',
    scenario: buildScenario('clean-host', BENIGN_PATHS),
    expected: { results: [], benignPaths: BENIGN_PATHS },
  },
];
