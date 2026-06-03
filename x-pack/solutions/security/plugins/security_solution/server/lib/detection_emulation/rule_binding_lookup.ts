/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EmulationRuleBindingLookup } from './execution/runner';
import { emulationRuleBindingTypeName, type EmulationRuleBindingAttributes } from './rule_binding';

/**
 * Build a {@link EmulationRuleBindingLookup} backed by the
 * `emulation-rule-binding` saved-object type.
 *
 * Why a factory + closure: the runner only needs `(emulationId) => binding?`
 * — it shouldn't know how the binding is fetched. Wrapping the SO client in a
 * closure keeps the runner free of saved-objects coupling and makes it easy
 * to swap out (tests pass a noop / fake; production gets this implementation).
 *
 * Scope:
 * - We use the *internal* (hidden=true) SO client variant; the type is
 *   registered with `hidden: true, hiddenFromHttpApis: true`, so a regular
 *   `request.savedObjectsClient` cannot read it.
 * - The lookup is best-effort: a missing binding returns `undefined` (the
 *   runner treats this as "no rule binding for this emulation"). Errors are
 *   logged and swallowed to keep the dispatch path resilient — failure to
 *   resolve a rule name must not block a Response Action.
 */
export function createSavedObjectRuleBindingLookup(
  soClient: SavedObjectsClientContract,
  logger: Logger
): EmulationRuleBindingLookup {
  return async (emulationId) => {
    try {
      const result = await soClient.find<EmulationRuleBindingAttributes>({
        type: emulationRuleBindingTypeName,
        search: `"${emulationId}"`,
        searchFields: ['emulationId'],
        // We only need one — the (emulationId, ruleId) pair is logically unique
        // and the most recently created binding wins if for any reason there
        // are duplicates.
        perPage: 1,
        sortField: 'createdAt',
        sortOrder: 'desc',
      });

      const hit = result.saved_objects[0];
      if (!hit) {
        return undefined;
      }

      return {
        ruleId: hit.attributes.ruleId,
        ruleName: hit.attributes.ruleName,
      };
    } catch (err) {
      // Best-effort: a binding lookup failure must not abort the dispatch.
      logger.warn(
        `Failed to resolve emulation→rule binding for emulationId=[${emulationId}]: ${
          (err as Error).message ?? err
        }`
      );
      return undefined;
    }
  };
}
