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
  discoveries,
  dateFormat,
  generationEndTime,
}: {
  alertsContextCount: number | null;
  connectorName?: string;
  dateFormat: string;
  discoveries?: number;
  generationEndTime?: string;
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
