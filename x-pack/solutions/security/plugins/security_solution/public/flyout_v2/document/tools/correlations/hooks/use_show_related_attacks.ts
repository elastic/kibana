/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord } from '@kbn/discover-utils';
import { ALERT_ATTACK_IDS } from '../../../../../../common/field_maps/field_names';
import { getFieldArray } from '../../../../../flyout/document_details/shared/utils';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../../../../../common/hooks/use_is_alerts_and_attacks_alignment_enabled';

export interface UseShowRelatedAttacksParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

export interface UseShowRelatedAttacksResult {
  /**
   * Returns true if the document has kibana.alert.attack_ids field with values
   */
  show: boolean;
  /**
   * Values of the kibana.alert.attack_ids field
   */
  attackIds: string[];
}

/**
 * Returns true if document has kibana.alert.attack_ids field with values
 */
export const useShowRelatedAttacks = ({
  hit,
}: UseShowRelatedAttacksParams): UseShowRelatedAttacksResult => {
  const enableAlertsAndAttacksAlignment = useIsAlertsAndAttacksAlignmentEnabled();

  const attackIds = getFieldArray(hit.flattened[ALERT_ATTACK_IDS]).filter(
    (attackId): attackId is string => typeof attackId === 'string'
  );

  return {
    show: enableAlertsAndAttacksAlignment,
    attackIds,
  };
};
