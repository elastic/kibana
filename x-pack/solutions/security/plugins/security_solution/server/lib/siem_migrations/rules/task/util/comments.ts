/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const cleanMarkdown = (markdown: string): string => {
  // Use languages known by the code block plugin
  return markdown.replaceAll('```esql', '```sql').replaceAll('```spl', '```splunk-spl');
};
