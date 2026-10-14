/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';
import {
  attackDiscoveryPrompts,
  promptDictionary as attackDiscoveryPromptDictionary,
  promptGroupId as attackDiscoveryPromptGroupId,
} from './attack_discovery_prompts';

export const promptGroupId = {
  ...attackDiscoveryPromptGroupId,
} as const;

export const promptDictionary = {
  ...attackDiscoveryPromptDictionary,
} as const;

export const localPrompts: Prompt[] = [...attackDiscoveryPrompts];
