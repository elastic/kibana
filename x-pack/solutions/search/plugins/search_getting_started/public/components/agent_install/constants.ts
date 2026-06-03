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

export const AGENT_ONBOARDING_MESSAGE = '/elasticsearch-onboarding';
