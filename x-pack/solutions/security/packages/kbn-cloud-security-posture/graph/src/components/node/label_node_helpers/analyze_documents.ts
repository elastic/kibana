/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';

export interface DocumentAnalysis {
  totalEvents: number;
  totalAlerts: number;
  totalDocuments: number;
  isSingleAlert: boolean;
  isSingleEvent: boolean;
  isGroupOfEvents: boolean;
  isGroupOfAlerts: boolean;
  isGroupOfEventsAndAlerts: boolean;
  eventDocuments: NodeDocumentDataModel[];
  alertDocuments: NodeDocumentDataModel[];
}

/**
 * Analyzes the documents data to categorize the label node type
 */
export const analyzeDocuments = (documentsData?: NodeDocumentDataModel[]): DocumentAnalysis => {
  const documents = documentsData || [];
  
  const eventDocuments = documents.filter(doc => doc.type === 'event');
  const alertDocuments = documents.filter(doc => doc.type === 'alert');
  
  const totalEvents = eventDocuments.length;
  const totalAlerts = alertDocuments.length;
  const totalDocuments = documents.length;
  
  const isSingleEvent = totalEvents === 1 && totalAlerts === 0;
  const isSingleAlert = totalAlerts === 1 && totalEvents === 0;
  const isGroupOfEvents = totalEvents > 1 && totalAlerts === 0;
  const isGroupOfAlerts = totalAlerts > 1 && totalEvents === 0;
  const isGroupOfEventsAndAlerts = totalEvents > 0 && totalAlerts > 0;
  
  return {
    totalEvents,
    totalAlerts,
    totalDocuments,
    isSingleAlert,
    isSingleEvent,
    isGroupOfEvents,
    isGroupOfAlerts,
    isGroupOfEventsAndAlerts,
    eventDocuments,
    alertDocuments,
  };
};

/**
 * Gets the background color for the label based on document analysis
 */
export const getLabelBackgroundColor = (analysis: DocumentAnalysis, euiTheme: any): string => {
  // If there are any alerts, use danger background
  if (analysis.totalAlerts > 0) {
    return euiTheme.colors.danger;
  }
  
  // If there are only events, use backgroundBasePrimary
  if (analysis.totalEvents > 0) {
    return euiTheme.colors.backgroundBasePrimary;
  }
  
  // Default fallback
  return euiTheme.colors.backgroundBasePrimary;
};

/**
 * Gets the text color for the label based on document analysis
 */
export const getLabelTextColor = (analysis: DocumentAnalysis, euiTheme: any): string => {
  // If there are any alerts, use backgroundBasePlain text color  
  if (analysis.totalAlerts > 0) {
    return euiTheme.colors.backgroundBasePlain;
  }
  
  // If there are only events, use textPrimary
  if (analysis.totalEvents > 0) {
    return euiTheme.colors.textPrimary;
  }
  
  // Default fallback
  return euiTheme.colors.textPrimary;
};