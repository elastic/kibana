/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';

import { GenerationPrompts } from '../prompts';
import { getAttackDiscoveriesGenerationSchema } from '../../generate/schema';

export const getOutputParser = (prompts: GenerationPrompts) =>
  StructuredOutputParser.fromZodSchema(getAttackDiscoveriesGenerationSchema(prompts));
