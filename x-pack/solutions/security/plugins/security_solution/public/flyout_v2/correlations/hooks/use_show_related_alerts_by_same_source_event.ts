/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_ANCESTORS_ID } from '../../../../common/field_maps/field_names';

export interface ShowRelatedAlertsBySameSourceEventParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

export interface ShowRelatedAlertsBySameSourceEventResult {
  /**
   * Returns true if the document has kibana.alert.original_event.id field with values
   */
  show: boolean;
  /**
   * Value of the kibana.alert.original_event.id field
   */
  originalEventId: string;
}

/**
 * Returns kibana.alert.ancestors.id field or default eventId
 */
export const useShowRelatedAlertsBySameSourceEvent = ({
  hit,
}: ShowRelatedAlertsBySameSourceEventParams): ShowRelatedAlertsBySameSourceEventResult => {
  const originalEventId = (getFieldValue(hit, ALERT_ANCESTORS_ID) as string) ?? hit.raw._id ?? '';

  return useMemo(
    () => ({
      show: true,
      originalEventId,
    }),
    [originalEventId]
  );
};
