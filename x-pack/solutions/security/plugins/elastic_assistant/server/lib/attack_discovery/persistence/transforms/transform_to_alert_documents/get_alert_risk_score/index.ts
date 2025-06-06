/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

export const getAlertRiskScore = ({
  alertIds,
  anonymizedAlerts,
}: {
  alertIds: string[];
  anonymizedAlerts: Document[];
}): number | undefined => {
  // The pageContent of each document **may** have the following fields, each on it's own line:
  // - _id
  // - kibana.alert.risk_score
  //
  // Example:
  // _id: abcd1234,
  // kibana.alert.risk_score: 50,

  const idRegex = /^\w*_id,\s*(.*)\w*\n?/m; // extracts the alert ID
  const riskScoreRegex = /^\w*kibana\.alert\.risk_score,\s*(\d+)\w*\n?/m; // extracts the risk score

  const alertIdRiskScoreMap: Record<string, number> = anonymizedAlerts.reduce((acc, alert) => {
    const idMatch = idRegex.exec(alert.pageContent);
    const riskScoreMatch = riskScoreRegex.exec(alert.pageContent);

    if (idMatch != null && riskScoreMatch != null) {
      const id = idMatch[1];
      const riskScore = parseFloat(riskScoreMatch[1]);

      return id != null && riskScore != null
        ? {
            ...acc,
            [id]: riskScore,
          }
        : acc;
    }

    return acc;
  }, {});

  const riskScore = alertIds.reduce((acc, alertId) => {
    const score = alertIdRiskScoreMap[alertId];

    return score != null ? acc + score : acc;
  }, 0);

  if (riskScore > 0) {
    return riskScore;
  }

  return undefined;
};
