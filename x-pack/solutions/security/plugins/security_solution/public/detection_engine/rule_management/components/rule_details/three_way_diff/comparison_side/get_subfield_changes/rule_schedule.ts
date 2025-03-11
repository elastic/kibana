/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleRuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import { toSimpleRuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export function getSubfieldChangesForRuleSchedule(
  oldFieldValue?: DiffableAllFields['rule_schedule'],
  newFieldValue?: DiffableAllFields['rule_schedule']
): SubfieldChange[] {
  const oldSimpleRuleSchedule = oldFieldValue ? toSimpleRuleSchedule(oldFieldValue) : undefined;
  const newSimpleRuleSchedule = newFieldValue ? toSimpleRuleSchedule(newFieldValue) : undefined;

  if (oldSimpleRuleSchedule && newSimpleRuleSchedule) {
    return getSubfieldChangesForSimpleRuleSchedule(oldSimpleRuleSchedule, newSimpleRuleSchedule);
  }

  const changes: SubfieldChange[] = [];

  if (oldFieldValue?.interval !== newFieldValue?.interval) {
    changes.push({
      subfieldName: 'interval',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.interval),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.interval),
    });
  }

  if (oldFieldValue?.from !== newFieldValue?.from) {
    changes.push({
      subfieldName: 'from',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.from),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.from),
    });
  }

  if (oldFieldValue?.to !== newFieldValue?.to) {
    changes.push({
      subfieldName: 'to',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.to),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.to),
    });
  }

  return changes;
}

function getSubfieldChangesForSimpleRuleSchedule(
  oldFieldValue: SimpleRuleSchedule,
  newFieldValue: SimpleRuleSchedule
): SubfieldChange[] {
  const changes: SubfieldChange[] = [];

  if (oldFieldValue.interval !== newFieldValue.interval) {
    changes.push({
      subfieldName: 'interval',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.interval),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.interval),
    });
  }

  if (oldFieldValue.lookback !== newFieldValue.lookback) {
    changes.push({
      subfieldName: 'lookback',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue.lookback),
      newSubfieldValue: stringifyToSortedJson(newFieldValue.lookback),
    });
  }

  return changes;
}
