/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedDate } from '../get_formatted_time';

import * as i18n from '../../translations';

export const getCanceledResultMessage = ({
  connectorName,
  dateFormat,
  generationEndTime,
}: {
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

  return i18n.CANCELED_VIA({
    connectorName,
    formattedGenerationEndTime,
  });
};
