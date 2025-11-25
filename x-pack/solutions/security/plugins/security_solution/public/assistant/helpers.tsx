/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeBlockDetails } from '@kbn/elastic-assistant';
import type { TimelineEventsDetailsItem } from '../../common/search_strategy';
import type { Rule } from '../detection_engine/rule_management/logic';
import { ESSENTIAL_ALERT_FIELDS } from '../../common/constants';

export const LOCAL_STORAGE_KEY = `securityAssistant`;

export const getPromptContextFromDetectionRules = (rules: Rule[]): string => {
  const data = rules.map((rule) => `Rule Name:${rule.name}\nRule Description:${rule.description}`);

  return data.join('\n\n');
};

export const getRawData = (data: TimelineEventsDetailsItem[]): Record<string, string[]> =>
  data
    .filter(({ field }) => !field.startsWith('signal.'))
    .reduce((acc, { field, values }) => ({ ...acc, [field]: values ?? [] }), {});

/**
 * Filters raw alert data to only include essential fields and stringifies the result.
 * This reduces context window usage by keeping only the most relevant information.
 */
export const filterAndStringifyAlertData = (rawData: Record<string, string[]>): string => {
  const filteredData = ESSENTIAL_ALERT_FIELDS.reduce((acc, key) => {
    if (key in rawData) {
      acc[key] = rawData[key];
    }
    return acc;
  }, {} as Record<string, string[]>);

  return JSON.stringify(filteredData);
};

export const sendToTimelineEligibleQueryTypes: Array<CodeBlockDetails['type']> = [
  'kql',
  'dsl',
  'eql',
  'esql',
  'sql', // Models often put the code block language as sql, for esql, so adding this as a fallback
];
