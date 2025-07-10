/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlKnowledgeBase } from '../esql_knowledge_base';
import type { PublicMethodsOf } from '@kbn/utility-types';

export const createEsqlKnowledgeBaseMock = () => {
  return {
    translate: jest.fn().mockResolvedValue(''),
  } as jest.Mocked<PublicMethodsOf<EsqlKnowledgeBase>>;
};

// Factory function for the mock class
export const MockEsqlKnowledgeBase = jest
  .fn()
  .mockImplementation(() => createEsqlKnowledgeBaseMock());
