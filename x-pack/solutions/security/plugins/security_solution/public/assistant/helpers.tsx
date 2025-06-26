/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeBlockDetails } from '@kbn/elastic-assistant';
import type { TimelineEventsDetailsItem } from '../../common/search_strategy';
import type { Rule } from '../detection_engine/rule_management/logic';

export const LOCAL_STORAGE_KEY = `securityAssistant`;

export const getPromptContextFromDetectionRules = (rules: Rule[]): string => {
  const data = rules.map((rule) => `Rule Name:${rule.name}\nRule Description:${rule.description}`);

  return data.join('\n\n');
};

export const getRawData = (data: TimelineEventsDetailsItem[]): Record<string, string[]> =>
  data
    .filter(({ field }) => !field.startsWith('signal.'))
    .reduce((acc, { field, values }) => ({ ...acc, [field]: values ?? [] }), {});

export const sendToTimelineEligibleQueryTypes: Array<CodeBlockDetails['type']> = [
  'kql',
  'dsl',
  'eql',
  'esql',
  'sql', // Models often put the code block language as sql, for esql, so adding this as a fallback
];
