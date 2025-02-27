/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import { getMvExpandDetails } from '@kbn/securitysolution-utils';
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
  duplicatedEventIds,
  columns,
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
  duplicatedEventIds: Record<string, number>;
  columns: string[];
}) => {
  const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();
  const mvExpandCommands = getMvExpandDetails(completeRule.ruleParams.query);

  const hasMvCommand = mvExpandCommands.length > 0;
  if (!isRuleAggregating && event._id) {
    const idFields = [
      event._id,
      event._version,
      event._index,
      `${spaceId}:${completeRule.alertId}`,
      ...(hasMvCommand
        ? retrieveExpandedValues({
            duplicatedEventIds,
            event,
            fields: mvExpandCommands.map((command) => command.field),
            columns,
            index,
          })
        : []),
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

const retrieveExpandedValues = ({
  event,
  fields,
  columns,
}: {
  event: estypes.SearchHit<SignalSource>;
  fields: string[];
  duplicatedEventIds: Record<string, number>;
  columns: string[];
  index: number;
}) => {
  if (!event._source) {
    return [];
  }

  const columnsSet = new Set(columns);
  const hasExpandedFieldsMissed = fields.some((f) => !columnsSet.has(f));
  const values = fields.map((field) =>
    event._source ? robustGet({ key: field, document: event._source }) : undefined
  );
  return hasExpandedFieldsMissed ? [event] : values.filter(Boolean);
};
