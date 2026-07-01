/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SecuritySkillsCategory = 'find-rules' | 'distractor';

export interface SecuritySkillsExample {
  input: {
    question: string;
  };
  expected: {
    reference: string;
    expectedSkill?: string;
    shouldNotActivateSkill?: string;
    tool_sequence?: string[];
  };
  metadata: {
    category: SecuritySkillsCategory;
    query_intent: string;
    dataset_split: string[];
    is_distractor?: boolean;
    expectedToolId?: string;
    expectedOnlyToolId?: string;
    tool_sequence?: string[];
  };
}
