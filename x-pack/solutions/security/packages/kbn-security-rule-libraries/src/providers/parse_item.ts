/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { RuleLibraryItem } from '../types';

const parseDocument = (
  path: string,
  text: string
): { type?: string; attributes?: Record<string, unknown> } => {
  const doc = path.endsWith('.json') ? JSON.parse(text) : parseYaml(text);
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`${path}: not a security-rule document with rule_id and version`);
  }
  return doc as { type?: string; attributes?: Record<string, unknown> };
};

export const parseItem = (path: string, data: Buffer): RuleLibraryItem => {
  const { type, attributes } = parseDocument(path, data.toString('utf8'));
  const ruleId = attributes?.rule_id;
  const version = attributes?.version;
  if (type !== 'security-rule' || typeof ruleId !== 'string' || typeof version !== 'number') {
    throw new Error(`${path}: not a security-rule document with rule_id and version`);
  }
  return { rule_id: ruleId, version, attributes: attributes ?? {} };
};
