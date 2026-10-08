/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { getNonLocalQualifiedIndex } from '../../../../shared/utils/non_local_index';
import { ALERT_ORIGINAL_TIME } from '../../../../../../common/field_maps/field_names';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
  PROCESS_ENTITY_ID,
} from '../../../main/constants/field_names';
import type { SessionViewConfig } from '../../../../../../common/types/session_view';

/**
 * Hook that returns the session view configuration if the session view is available for the alert
 */
export const useSessionViewConfig = (hit: DataTableRecord): SessionViewConfig | null => {
  const documentIndexName = hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '';
  const index = getNonLocalQualifiedIndex(
    (getFieldValue(hit, ANCESTOR_INDEX) as string) ?? hit.raw._index,
    documentIndexName
  );
  const entryLeaderEntityId = getFieldValue(hit, ENTRY_LEADER_ENTITY_ID) as string;
  const entryLeaderStart = getFieldValue(hit, ENTRY_LEADER_START) as string;
  const entityId = getFieldValue(hit, PROCESS_ENTITY_ID) as string;
  const time =
    (getFieldValue(hit, ALERT_ORIGINAL_TIME) as string) ||
    (getFieldValue(hit, 'timestamp') as string);
  const alertId = hit.raw._id;

  return useMemo(
    () =>
      !index || !entryLeaderEntityId || !entryLeaderStart
        ? null
        : {
            index,
            sessionEntityId: entryLeaderEntityId,
            sessionStartTime: entryLeaderStart,
            ...(entityId && { jumpToEntityId: entityId }),
            ...(time && { jumpToCursor: time }),
            ...(alertId && { investigatedAlertId: alertId }),
          },
    [alertId, entityId, entryLeaderEntityId, entryLeaderStart, index, time]
  );
};
