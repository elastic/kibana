/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ANCESTORS_ID } from '../../../../../common/field_maps/field_names';
import type { GetFieldsData } from './use_get_fields_data';
import { getField } from '../utils';

export interface ShowRelatedAlertsBySameSourceEventParams {
  /**
   * Id of the event document
   */
  eventId: string;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
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
  eventId,
  getFieldsData,
}: ShowRelatedAlertsBySameSourceEventParams): ShowRelatedAlertsBySameSourceEventResult => {
  const originalEventId = getField(getFieldsData(ALERT_ANCESTORS_ID)) ?? eventId;
  return {
    show: true,
    originalEventId,
  };
};
