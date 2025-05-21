/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getEsqlKeepStatement = (tableStackBy0: string): string => {
  const commonFields = ['@timestamp', 'host.name', 'user.name'];

  // renames the rule name and risk score fields to 'Rule name' and 'Risk score':
  const renameRuleNameAndRiskScore = `| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, ${commonFields.join(', ')}`;

  // renames the risk score field to 'Risk score' and keeps the table stack by field:
  const renameRiskScoreKeepTableStackBy0 = `| RENAME kibana.alert.risk_score AS \`Risk score\`
| KEEP \`${tableStackBy0}\`, \`Risk score\`, ${commonFields.join(', ')}`;

  return tableStackBy0 === 'kibana.alert.rule.name'
    ? renameRuleNameAndRiskScore
    : renameRiskScoreKeepTableStackBy0;
};
