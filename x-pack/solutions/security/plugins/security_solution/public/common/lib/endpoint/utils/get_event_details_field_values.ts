/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';

/**
 * Gets the array of values for a given field in an Alert Details data
 *
 * @param category
 * @param field
 * @param data
 */
const getEventDetailsFieldValues = (
  {
    category,
    field,
  }: {
    category: string;
    field: string;
  },
  data: TimelineEventsDetailsItem[] | null
): string[] => {
  const categoryCompat =
    category === 'signal' ? 'kibana' : category === 'kibana' ? 'signal' : category;
  const fieldCompat =
    category === 'signal'
      ? field.replace('signal', 'kibana.alert').replace('rule.id', 'rule.uuid')
      : category === 'kibana'
      ? field.replace('kibana.alert', 'signal').replace('rule.uuid', 'rule.id')
      : field;
  return (
    find({ category, field }, data)?.values ??
    find({ category: categoryCompat, field: fieldCompat }, data)?.values ??
    []
  );
};

/**
 * Gets a single value for a given Alert Details data field. If the field has multiple values,
 * the first one will be returned.
 *
 * @param category
 * @param field
 * @param data
 */
export const getAlertDetailsFieldValue = (
  {
    category,
    field,
  }: {
    category: string;
    field: string;
  },
  data: TimelineEventsDetailsItem[] | null
): string => {
  const currentField = getEventDetailsFieldValues({ category, field }, data);
  return currentField && currentField.length > 0 ? currentField[0] : '';
};
