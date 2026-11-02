/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import { alertHasValue, parseAlerts, type ParsedAlert } from '../audit_failure_classes/alert_csv';
import {
  getDiscoveryMarkdown,
  parseFieldTokens,
  type FieldToken,
} from '../audit_failure_classes/discovery_text';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_ENTITY_CO_OCCURRENCE_EVALUATOR_NAME = 'EntityCoOccurrence';

const isUserField = (field: string): boolean => field.startsWith('user.');

const isLinkedField = (field: string): boolean =>
  field === 'source.ip' || field === 'cloud.account.id' || field.startsWith('host.');

const tokenKey = ({ field, value }: FieldToken): string => `${field}=${value.trim()}`;

const uniqueTokens = (tokens: FieldToken[]): FieldToken[] =>
  Array.from(new Map(tokens.map((token) => [tokenKey(token), token])).values());

/**
 * Invented entity joins at the sentence level. A discovery that writes
 * `{{ user.name alice }}` next to `{{ source.ip 203.0.113.50 }}` asserts that alice used that
 * IP. The assertion is grounded only if one alert the discovery cites carries both values.
 * Score is grounded pairs over asserted pairs.
 *
 * Limits: only `{{ field value }}` tokens are read, so an entity named in plain prose asserts
 * nothing; every user x linked-entity pair inside one discovery counts, even when the prose
 * does not link them; and a value absent from the rendered alert (for example
 * `cloud.account.id` in the baseline variant) can never be grounded.
 */
export const createAuditEntityCoOccurrenceEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => ({
  name: AUDIT_ENTITY_CO_OCCURRENCE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output });
    if ('result' in resolved) return resolved.result;

    const alertsById = new Map<string, ParsedAlert>(
      input?.mode === 'bundledAlerts'
        ? parseAlerts(input.anonymizedAlerts).map((alert) => [alert.id, alert])
        : []
    );

    const ungrounded: string[] = [];
    let asserted = 0;

    for (const discovery of resolved.discoveries) {
      const tokens = uniqueTokens(parseFieldTokens(getDiscoveryMarkdown(discovery)));
      const users = tokens.filter(({ field }) => isUserField(field));
      const linked = tokens.filter(({ field }) => isLinkedField(field));
      const cited = discovery.alertIds
        .map((id) => alertsById.get(id))
        .filter((alert): alert is ParsedAlert => alert !== undefined);

      for (const user of users) {
        for (const other of linked) {
          asserted += 1;
          const grounded = cited.some(
            (alert) =>
              alertHasValue(alert, user.field, user.value) &&
              alertHasValue(alert, other.field, other.value)
          );
          if (!grounded) {
            ungrounded.push(`${tokenKey(user)} with ${tokenKey(other)}`);
          }
        }
      }
    }

    if (asserted === 0) {
      return notApplicable('No user and source.ip/cloud.account.id/host token pair was asserted.');
    }

    const score = (asserted - ungrounded.length) / asserted;
    return {
      score,
      label: ungrounded.length === 0 ? 'grounded' : 'ungrounded_pairs',
      explanation:
        ungrounded.length === 0
          ? `${asserted} asserted pairs, all grounded`
          : `${
              ungrounded.length
            }/${asserted} asserted pairs no cited alert carries: ${ungrounded.join('; ')}`,
    };
  },
});
