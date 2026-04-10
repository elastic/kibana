/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Environment = 'cli' | 'agent-builder';

export const INSTALL_LINES_CLI = [
  'Install the elasticsearch onboarding skill:',
  '```sh\nnpx skills add elastic/agent-skills --skill elasticsearch-onboarding -y\n```',
];

export const AGENT_ONBOARDING_MESSAGE = `Load the search.elasticsearch-onboarding skill now and follow it as the primary conversation driver for this entire session. That skill contains a structured playbook (Steps 1–7) that must control the conversation flow — ask one question at a time, walk through intent, data, mapping, and Dev Tools API snippets in order. When you need deep implementation detail, load a supplementary skill (e.g. search.vector-hybrid-search), but always return to the onboarding playbook afterward for sequencing. Help me get started with Elasticsearch.`;
