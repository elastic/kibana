/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThreatMapping,
  RuleCreateProps,
  RulePatchProps,
  RuleUpdateProps,
} from '../../api/detection_engine/model/rule_schema';

/**
 * Not match field clause can not use same mapping fields as match clause in same AND condition.
 * This function checks if there are any entries that have a negate=true(DOES_NOT_MATCH)
 * and MATCH clause with the same field and value in the item(ThreatMapEntries)
 *
 * For example:
 *@example
 *```
 * user.name MATCHES threat.indicator.user.name
 * AND
 * user.name DOES_NOT_MATCH threat.indicator.user.name
 *```
 * is not allowed.
 */
export const containsInvalidDoesNotMatchEntries = (items: ThreatMapping): boolean => {
  return items.some((item) => {
    const negateMap = new Map<string, Set<string>>();

    item.entries.forEach(({ negate, field, value }) => {
      if (!negate) {
        return;
      }

      if (negateMap.has(field)) {
        negateMap.get(field)?.add(value);
      } else {
        negateMap.set(field, new Set([value]));
      }
    });

    if (negateMap.size === 0) {
      return false;
    }
    return item.entries.some(
      ({ field, value, negate }) => negate !== true && negateMap.get(field)?.has(value)
    );
  });
};

/**
 * Checks if there are any entries that have a only entry with negate set to true(DOES_NOT_MATCH)
 */
export const containsDoesNotMatchEntriesOnly = (items: ThreatMapping): boolean => {
  return items.some((item) => {
    return item.entries.every((entry) => entry.negate === true);
  });
};

export const validateThreatMapping = (
  props: RuleCreateProps | RuleUpdateProps | RulePatchProps
): string[] => {
  if (!('threat_mapping' in props)) {
    return [];
  }

  // can be patch properties where threat_mapping is undefined
  if (props.threat_mapping == null) {
    return [];
  }

  if (containsDoesNotMatchEntriesOnly(props.threat_mapping)) {
    return [
      'Negate mappings cannot be used as a single entry in the AND condition. Please use at least one matching mapping entry.',
    ];
  }

  if (containsInvalidDoesNotMatchEntries(props.threat_mapping)) {
    return [
      'Negate and matching mappings cannot have identical fields and values in the same AND condition.',
    ];
  }

  return [];
};
