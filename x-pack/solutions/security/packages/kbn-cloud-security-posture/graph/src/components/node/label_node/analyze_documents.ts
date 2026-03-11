/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface DocumentAnalysisInput {
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
}
export interface DocumentAnalysisOutput {
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  isSingleAlert: boolean;
  isSingleEvent: boolean;
  isGroupOfEvents: boolean;
  isGroupOfAlerts: boolean;
  isGroupOfEventsAndAlerts: boolean;
}

/**
 * Analyzes the documents data to categorize the label node type
 */
export const analyzeDocuments = ({
  uniqueEventsCount,
  uniqueAlertsCount,
}: DocumentAnalysisInput): DocumentAnalysisOutput => {
  return {
    uniqueEventsCount,
    uniqueAlertsCount,
    isSingleAlert: uniqueAlertsCount === 1 && uniqueEventsCount === 0,
    isSingleEvent: uniqueEventsCount === 1 && uniqueAlertsCount === 0,
    isGroupOfEvents: uniqueEventsCount > 1 && uniqueAlertsCount === 0,
    isGroupOfAlerts: uniqueAlertsCount > 1 && uniqueEventsCount === 0,
    isGroupOfEventsAndAlerts: uniqueEventsCount > 0 && uniqueAlertsCount > 0,
  };
};
