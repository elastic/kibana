/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getEsqlKeepStatement = (tableStackBy0: string): string => {
  // renames the table stack by field to 'Rule name'
  const renameAsRuleName = `| RENAME kibana.alert.rule.name AS \`Rule name\`
| KEEP \`Rule name\`, Count`;

  // just keeps the table stack by field:
  const keepTableStackBy0 = `| KEEP \`${tableStackBy0}\`, Count`;

  return tableStackBy0 === 'kibana.alert.rule.name' ? renameAsRuleName : keepTableStackBy0;
};
