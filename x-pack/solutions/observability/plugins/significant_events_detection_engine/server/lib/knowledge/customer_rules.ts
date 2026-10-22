/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import { getErrorMessage } from '../errors';
import type { IStateStore } from '../storage/state_store';

/** Rule parameters the model reads; enough for an index, a query and a group-by. */
const MAX_PARAMETERS_SHOWN = 4_000;
const MAX_SERVICES_SHOWN = 200;

/** A customer rule as its alerts describe it. */
export interface CustomerRuleDefinition {
  rule_uuid: string;
  name: string;
  rule_type_id?: string;
  tags: string[];
  /** The rule's parameters as the alert carries them: index, query, filters, group-by. */
  parameters: unknown;
}

/**
 * What knowledge holds about one customer rule: the entity it watches. Read once per rule and
 * definition; a changed rule is read again.
 */
export interface CustomerRuleEntity {
  rule_uuid: string;
  /** Hash of the rule's name, tags and parameters. */
  definition_hash: string;
  /** The service the rule watches; absent when nothing names one. */
  service?: string;
  /** `definition`: a known service is named in the rule; `model`: a low-cost model read it. */
  found_by: 'definition' | 'model' | 'none';
  at: string;
}

/** Knowledge from customer rules: which entity each rule watches. */
export interface ICustomerRuleKnowledge {
  /**
   * The entity of each rule. Stored answers are reused; a rule seen for the first time, or
   * changed, is read from its definition, then by the model while this run has calls left.
   */
  entitiesFor(rules: CustomerRuleDefinition[]): Promise<Map<string, CustomerRuleEntity>>;
}

export function definitionHash(rule: CustomerRuleDefinition): string {
  return createHash('sha256')
    .update(JSON.stringify([rule.name, [...rule.tags].sort(), rule.parameters ?? null]))
    .digest('hex')
    .slice(0, 16);
}

/** Words only, padded, so a service matches as a whole phrase: `edge-cache` in `logs-edge_cache`. */
const words = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

/**
 * The one known service a rule's name or parameters name, or undefined when none or several do.
 * A longer name wins over one inside it, so `edge-cache` beats `cache`.
 */
export function serviceNamedIn({
  rule,
  services,
}: {
  rule: CustomerRuleDefinition;
  services: string[];
}): string | undefined {
  const haystack = words(`${rule.name} ${JSON.stringify(rule.parameters ?? '')}`);
  const named = services.filter((service) => haystack.includes(words(service)));
  const longest = named.filter(
    (service) => !named.some((other) => other !== service && words(other).includes(words(service)))
  );
  return longest.length === 1 ? longest[0] : undefined;
}

const ENTITY_SYSTEM = `You read one alerting rule of a customer's system and name the service it watches.
You get the rule's name, type, tags and parameters, and the services the system has. Answer with one service
from that list, or an empty string when the rule watches several services, none of them, or you cannot tell.
Never guess.`;

const ENTITY_SCHEMA = {
  type: 'object',
  properties: {
    service: {
      type: 'string',
      description: 'One service from the list, or an empty string.',
    },
  },
  required: ['service'],
} as const;

/**
 * Reads entities from the definition first, in code, and asks a low-cost model only for the
 * rules whose definition names no known service. Every answer is stored, so each rule costs at
 * most one model call for as long as it does not change.
 */
export function createCustomerRuleKnowledge({
  state,
  knownServices,
  model,
  maxModelCalls,
  logger,
  signal,
}: {
  state: IStateStore;
  /** Services the engine sees in the data; only these can be an answer. */
  knownServices: () => Promise<string[]>;
  /** Absent: rules whose definition names no service stay without an entity. */
  model?: { inferenceClient: InferenceClient; connectorId: string };
  /** Model calls this run may make; the other rules are read on a later run. */
  maxModelCalls: number;
  logger: Logger;
  signal: AbortSignal;
}): ICustomerRuleKnowledge {
  let callsLeft = maxModelCalls;

  const askModel = async (
    rule: CustomerRuleDefinition,
    services: string[]
  ): Promise<string | undefined> => {
    const response = await model!.inferenceClient.output({
      id: 'detection_engine_customer_rule_entity',
      connectorId: model!.connectorId,
      system: ENTITY_SYSTEM,
      input: JSON.stringify(
        {
          rule: {
            name: rule.name,
            type: rule.rule_type_id,
            tags: rule.tags,
            parameters: JSON.stringify(rule.parameters ?? {}).slice(0, MAX_PARAMETERS_SHOWN),
          },
          services: services.slice(0, MAX_SERVICES_SHOWN),
        },
        null,
        2
      ),
      schema: ENTITY_SCHEMA,
      abortSignal: signal,
    });
    const answer = (response.output as { service?: unknown }).service;
    // Only a service the system has: a made-up name would join nothing, or the wrong thing.
    return typeof answer === 'string' && services.includes(answer) ? answer : undefined;
  };

  return {
    async entitiesFor(rules) {
      const unique = [...new Map(rules.map((rule) => [rule.rule_uuid, rule])).values()];
      if (unique.length === 0) {
        return new Map();
      }
      const stored = await state.getMany(
        'customer_rule',
        unique.map((rule) => rule.rule_uuid)
      );
      const fresh = unique.filter(
        (rule) => stored.get(rule.rule_uuid)?.definition_hash !== definitionHash(rule)
      );
      // Listing services costs a query, so only when a rule has to be read.
      const services = fresh.length > 0 ? await knownServices() : [];
      const resolved = await Promise.all(
        unique.map(async (rule): Promise<CustomerRuleEntity | undefined> => {
          const hash = definitionHash(rule);
          const known = stored.get(rule.rule_uuid);
          // Stored answers are final for a definition: the model is asked once per rule.
          if (known && known.definition_hash === hash) {
            return known;
          }
          const fromDefinition = serviceNamedIn({ rule, services });
          if (fromDefinition) {
            return save({ rule, hash, service: fromDefinition, foundBy: 'definition' });
          }
          if (!model || callsLeft <= 0 || services.length === 0) {
            // Read again on a later run, when the model has calls left.
            return { rule_uuid: rule.rule_uuid, definition_hash: hash, found_by: 'none', at: '' };
          }
          callsLeft -= 1;
          try {
            const service = await askModel(rule, services);
            return save({ rule, hash, service, foundBy: service ? 'model' : 'none' });
          } catch (error) {
            logger.debug(`Could not read customer rule ${rule.name}: ${getErrorMessage(error)}`);
            return undefined;
          }
        })
      );
      return new Map(
        resolved.flatMap((entity) => (entity ? [[entity.rule_uuid, entity] as const] : []))
      );
    },
  };

  async function save({
    rule,
    hash,
    service,
    foundBy,
  }: {
    rule: CustomerRuleDefinition;
    hash: string;
    service?: string;
    foundBy: CustomerRuleEntity['found_by'];
  }): Promise<CustomerRuleEntity> {
    const entity: CustomerRuleEntity = {
      rule_uuid: rule.rule_uuid,
      definition_hash: hash,
      service,
      found_by: foundBy,
      at: new Date().toISOString(),
    };
    await state.put('customer_rule', entity, { key: rule.rule_uuid });
    return entity;
  }
}
