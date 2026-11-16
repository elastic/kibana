/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_PROMPT = [
  'Install the Elastic skills:',
  '`npx skills add elastic/agent-skills`',
  '',
  'Help me get started with my Elastic Vector Database',
].join('\n');

export const AGENT_ONBOARDING_MESSAGE = '/elasticsearch-onboarding';
export const AGENT_SESSION_TAG = 'vectordb-getting-started';
