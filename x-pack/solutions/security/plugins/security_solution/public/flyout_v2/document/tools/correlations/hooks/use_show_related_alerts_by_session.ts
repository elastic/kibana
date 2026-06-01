/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ENTRY_LEADER_ENTITY_ID } from '../../../main/constants/field_names';

export interface UseShowRelatedAlertsBySessionParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

export interface UseShowRelatedAlertsBySessionResult {
  /**
   * Returns true if the document has process.entry_leader.entity_id field with values
   */
  show: boolean;
  /**
   * Value of the process.entry_leader.entity_id field
   */
  entityId?: string;
}

/**
 * Returns true if document has process.entry_leader.entity_id field with values
 */
export const useShowRelatedAlertsBySession = ({
  hit,
}: UseShowRelatedAlertsBySessionParams): UseShowRelatedAlertsBySessionResult => {
  const entityId = getFieldValue(hit, ENTRY_LEADER_ENTITY_ID) as string | undefined;

  return useMemo(
    () => ({
      show: entityId != null,
      ...(entityId && { entityId }),
    }),
    [entityId]
  );
};
