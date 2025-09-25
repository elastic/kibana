/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface DocumentAnalysisInput {
  eventsCount: number;
  alertsCount: number;
}
export interface DocumentAnalysisOutput {
  eventsCount: number;
  alertsCount: number;
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
  eventsCount,
  alertsCount,
}: DocumentAnalysisInput): DocumentAnalysisOutput => {
  return {
    eventsCount,
    alertsCount,
    isSingleAlert: alertsCount === 1 && eventsCount === 0,
    isSingleEvent: eventsCount === 1 && alertsCount === 0,
    isGroupOfEvents: eventsCount > 1 && alertsCount === 0,
    isGroupOfAlerts: alertsCount > 1 && eventsCount === 0,
    isGroupOfEventsAndAlerts: eventsCount > 0 && alertsCount > 0,
  };
};
