/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import { robustGet } from '../../utils/source_fields_merging/utils/robust_field_access';
import type { CompleteRule, EsqlRuleParams } from '../../../rule_schema';
import type { SignalSource } from '../../types';

/**
 * Generates id for ES|QL alert.
 * Id is generated as hash of event properties and rule/space config identifiers.
 * This would allow to deduplicate alerts, generated from the same event.
 */
export const generateAlertId = ({
  event,
  spaceId,
  completeRule,
  tuple,
  isRuleAggregating,
  index,
  expandedFields,
}: {
  isRuleAggregating: boolean;
  event: estypes.SearchHit<SignalSource>;
  spaceId: string | null | undefined;
  completeRule: CompleteRule<EsqlRuleParams>;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  index: number;
  expandedFields?: string[];
}) => {
  const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();

  if (!isRuleAggregating && event._id) {
    const idFields = [
      event._id,
      event._version,
      event._index,
      `${spaceId}:${completeRule.alertId}`,
      ...retrieveExpandedValues({
        event,
        fields: expandedFields,
      }),
    ];
    return objectHash(idFields);
  } else {
    return objectHash([
      ruleRunId,
      completeRule.ruleParams.query,
      `${spaceId}:${completeRule.alertId}`,
      index,
    ]);
  }
};

/**
 * returns array of values from source event for requested list of fields
 * undefined values are dropped
 */
const retrieveExpandedValues = ({
  event,
  fields,
}: {
  event: estypes.SearchHit<SignalSource>;
  fields?: string[];
}) => {
  if (!fields || !event._source) {
    return [];
  }

  const values = fields.map((field) =>
    event._source ? robustGet({ key: field, document: event._source }) : undefined
  );
  return fields.length === 0 ? [event] : values.filter(Boolean);
};
