/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelProvider, LLMs } from './types';

export const MODELS: ModelProvider[] = [
  {
    name: 'OpenAI GPT-4o',
    model: 'gpt-4o',
    promptTokenLimit: 128000,
    provider: LLMs.openai,
  },
  {
    name: 'OpenAI GPT-4 Turbo',
    model: 'gpt-4-turbo',
    promptTokenLimit: 128000,
    provider: LLMs.openai,
  },
  {
    name: 'OpenAI GPT-3.5 Turbo',
    model: 'gpt-3.5-turbo',
    promptTokenLimit: 16385,
    provider: LLMs.openai,
  },
  {
    name: 'Anthropic Claude 3 Haiku',
    model: 'anthropic.claude-3-haiku-20240307-v1:0',
    promptTokenLimit: 200000,
    provider: LLMs.bedrock,
  },
  {
    name: 'Anthropic Claude 3.5 Sonnet',
    model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    promptTokenLimit: 200000,
    provider: LLMs.bedrock,
  },
  {
    name: 'Google Gemini 1.5 Pro',
    model: 'gemini-1.5-pro-002',
    promptTokenLimit: 2097152,
    provider: LLMs.gemini,
  },
  {
    name: 'Google Gemini 1.5 Flash',
    model: 'gemini-1.5-flash-002',
    promptTokenLimit: 2097152,
    provider: LLMs.gemini,
  },
];
