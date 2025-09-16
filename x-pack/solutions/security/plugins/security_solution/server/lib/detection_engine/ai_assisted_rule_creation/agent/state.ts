/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';

export const RuleCreationAnnotation = Annotation.Root({
  userQuery: Annotation<string>(),
  answer: Annotation<string>(),
  rule: Annotation<any>(), 
  error: Annotation<string>(), 
});

export type RuleCreationState = typeof RuleCreationAnnotation.State;