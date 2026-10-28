/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedDate } from '../get_formatted_time';

import * as i18n from '../../translations';

export const getSuccessResultMessage = ({
  alertsContextCount,
  connectorName,
  dateFormat,
  discoveries,
  duplicatesDroppedCount,
  generatedCount,
  generationEndTime,
  hallucinationsFilteredCount,
  persistedCount,
}: {
  alertsContextCount: number | null;
  connectorName?: string;
  dateFormat: string;
  discoveries?: number;
  duplicatesDroppedCount?: number;
  generatedCount?: number;
  generationEndTime?: string;
  hallucinationsFilteredCount?: number;
  persistedCount?: number;
}): string => {
  const formattedGenerationEndTime =
    getFormattedDate({
      date: generationEndTime,
      dateFormat,
    }) ?? undefined;

  // If the count is known to be 0, show the "no matching alerts" message
  if (alertsContextCount === 0) {
    return i18n.NO_MATCHING_ALERTS_VIA({
      connectorName,
      formattedGenerationEndTime,
    });
  }

  // Use detailed summary breakdown when full summary stats are available
  if (persistedCount != null && generatedCount != null && duplicatesDroppedCount != null) {
    return i18n.RAN_SUCCESSFULLY_VIA_WITH_SUMMARY({
      connectorName,
      duplicatesDroppedCount,
      formattedGenerationEndTime,
      generatedCount,
      hallucinationsFilteredCount,
      persistedCount,
    });
  }

  if (discoveries != null) {
    return i18n.RAN_SUCCESSFULLY_VIA_WITH_DISCOVERIES_COUNT({
      connectorName,
      discoveries,
      formattedGenerationEndTime,
    });
  }

  return i18n.RAN_SUCCESSFULLY_VIA_NO_DISCOVERIES_COUNT({
    connectorName,
    formattedGenerationEndTime,
  });
};
