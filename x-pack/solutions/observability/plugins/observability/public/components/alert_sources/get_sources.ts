/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_GROUP } from '@kbn/rule-data-utils';
import { getGroupsFromAlertFields } from '../../../common/custom_threshold_rule/helpers/get_group';
import type { Group } from '../../../common/typings';
import type { TopAlert } from '../../typings/alerts';
import { apmSources, infraSources } from './get_alert_source_links';

interface AlertFields {
  [key: string]: any;
}

export const getSources = (alert: TopAlert): Group[] => {
  // A nested group, even one that yields no valid pairs, skips the entity-field fallback.
  if (alert.fields[ALERT_GROUP]) {
    return getGroupsFromAlertFields(alert.fields);
  }

  const groupsFromGroupFields = getGroupsFromAlertFields(alert.fields);
  if (groupsFromGroupFields.length) {
    return groupsFromGroupFields;
  }

  // Not all rules has group.fields, in that case we search in the alert fields.
  const matchedSources: Group[] = [];
  const ALL_SOURCES = [...infraSources, ...apmSources];
  const alertFields = alert.fields as AlertFields;
  ALL_SOURCES.forEach((source: string) => {
    Object.keys(alertFields).forEach((field: any) => {
      if (source === field) {
        const fieldValue = alertFields[field];
        matchedSources.push({
          field: source,
          value: Array.isArray(fieldValue) ? fieldValue[0] : fieldValue,
        });
      }
    });
  });

  return matchedSources;
};
