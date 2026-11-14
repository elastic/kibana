/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TableId } from '@kbn/securitysolution-data-table';
import { getEcsField } from '../../../flyout_v2/shared/components/table_field_name_cell';
import {
  HOST_ENTITY_ID_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { EVENT_SOURCE_FIELD_DESCRIPTOR } from '../../../common/components/event_details/translations';

// Helper function to check if the field has a flyout link
export const isFlyoutLink = ({
  field,
  ruleId,
  scopeId,
}: {
  field: string;
  ruleId?: string;
  scopeId: string;
}) => {
  // don't show link for rule name if rule id is not provided or if isRulePreview is true
  if (field === SIGNAL_RULE_NAME_FIELD_NAME) {
    return !!ruleId && scopeId !== TableId.rulePreview;
  }
  return FLYOUT_FIELDS.includes(field) || getEcsField(field)?.type === IP_FIELD_TYPE;
};

const FLYOUT_FIELDS = [
  HOST_NAME_FIELD_NAME,
  HOST_ENTITY_ID_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  EVENT_SOURCE_FIELD_DESCRIPTOR,
];
