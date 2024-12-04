/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SessionViewConfig } from '@kbn/securitysolution-data-table/common/types';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { getField } from '../../shared/utils';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';

export interface UseSessionPreviewParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

/**
 * Hook that returns the session view configuration if the session view is available for the alert
 */
export const useSessionPreview = ({
  getFieldsData,
  dataFormattedForFieldBrowser,
}: UseSessionPreviewParams): SessionViewConfig | null => {
  const { indexName: _index, alertId: _id } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const index = getField(getFieldsData('kibana.alert.ancestors.index')) || _index;
  const entryLeaderEntityId = getField(getFieldsData('process.entry_leader.entity_id'));
  const entryLeaderStart = getField(getFieldsData('process.entry_leader.start'));
  const entityId = getField(getFieldsData('process.entity_id'));
  const time =
    getField(getFieldsData('kibana.alert.original_time')) || getField(getFieldsData('timestamp'));

  if (!index || !entryLeaderEntityId || !entryLeaderStart) {
    return null;
  }

  return {
    index,
    sessionEntityId: entryLeaderEntityId,
    sessionStartTime: entryLeaderStart,
    ...(entityId && { jumpToEntityId: entityId }),
    ...(time && { jumpToCursor: time }),
    ...(_id && { investigatedAlertId: _id }),
  };
};
