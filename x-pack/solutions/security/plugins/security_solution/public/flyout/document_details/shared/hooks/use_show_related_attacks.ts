/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { GetFieldsData } from './use_get_fields_data';
import { getFieldArray } from '../utils';

export interface UseShowRelatedAttacksParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
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
  getFieldsData,
}: UseShowRelatedAttacksParams): UseShowRelatedAttacksResult => {
  const { uiSettings } = useKibana().services;
  const enableAlertsAndAttacksAlignment = uiSettings.get(
    ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
    false
  );

  const attackIds = getFieldArray(getFieldsData(ALERT_ATTACK_IDS)).filter(
    (attackId): attackId is string => typeof attackId === 'string'
  );

  return {
    show: enableAlertsAndAttacksAlignment && attackIds.length > 0,
    attackIds,
  };
};
