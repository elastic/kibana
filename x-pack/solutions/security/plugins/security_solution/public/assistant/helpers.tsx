/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeBlockDetails } from '@kbn/elastic-assistant';
import type { TimelineEventsDetailsItem } from '../../common/search_strategy';

export const LOCAL_STORAGE_KEY = `securityAssistant`;

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
