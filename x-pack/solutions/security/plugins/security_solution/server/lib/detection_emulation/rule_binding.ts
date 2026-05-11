/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

/**
 * Saved object type name for emulation-to-rule bindings.
 */
export const emulationRuleBindingTypeName = 'emulation-rule-binding';

/**
 * Attributes stored in the emulation rule binding saved object.
 * Links an emulation run to a specific detection rule.
 */
export interface EmulationRuleBindingAttributes {
  /**
   * Unique identifier for the emulation run.
   */
  emulationId: string;

  /**
   * Detection rule ID (rule_id field from the detection rule).
   * This is the stable identifier for the rule, not the saved object ID.
   */
  ruleId: string;

  /**
   * Optional rule name for display purposes.
   */
  ruleName?: string;

  /**
   * Timestamp when the binding was created (ISO 8601).
   */
  createdAt: string;

  /**
   * Optional metadata about the emulation run.
   */
  metadata?: {
    /**
     * Emulation mode (test, validation, production)
     */
    mode?: string;

    /**
     * Additional context or tags
     */
    tags?: string[];
  };
}

/**
 * Saved object mappings for the emulation rule binding type.
 */
export const emulationRuleBindingTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    emulationId: {
      type: 'keyword',
    },
    ruleId: {
      type: 'keyword',
    },
    ruleName: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    createdAt: {
      type: 'date',
    },
    metadata: {
      properties: {
        mode: {
          type: 'keyword',
        },
        tags: {
          type: 'keyword',
        },
      },
    },
  },
};

/**
 * Saved object type definition for emulation-to-rule bindings.
 *
 * This saved object type provides persistent storage for linking emulation runs
 * to specific detection rules. Each binding records:
 * - Which emulation run triggered which detection rule
 * - When the binding was created
 * - Optional metadata about the emulation context
 *
 * The saved object approach was chosen over alternatives for several reasons:
 * 1. Persistence: Bindings survive across Kibana restarts and deployments
 * 2. Query capability: Efficient lookups by emulationId or ruleId
 * 3. Audit trail: Built-in versioning and change tracking
 * 4. Space isolation: Bindings are scoped to the Kibana space
 * 5. Platform integration: Leverages existing backup/restore/migration
 *
 * Example usage:
 * ```typescript
 * const binding = await soClient.create<EmulationRuleBindingAttributes>(
 *   emulationRuleBindingTypeName,
 *   {
 *     emulationId: 'emulation-abc-123',
 *     ruleId: 'detect-malicious-process',
 *     ruleName: 'Detect Malicious Process Execution',
 *     createdAt: new Date().toISOString(),
 *     metadata: { mode: 'test' }
 *   }
 * );
 *
 * // Find all bindings for a specific emulation run
 * const { saved_objects } = await soClient.find<EmulationRuleBindingAttributes>({
 *   type: emulationRuleBindingTypeName,
 *   search: emulationId,
 *   searchFields: ['emulationId']
 * });
 *
 * // Find all emulation runs that triggered a specific rule
 * const { saved_objects } = await soClient.find<EmulationRuleBindingAttributes>({
 *   type: emulationRuleBindingTypeName,
 *   search: ruleId,
 *   searchFields: ['ruleId']
 * });
 * ```
 */
export const emulationRuleBindingType: SavedObjectsType = {
  name: emulationRuleBindingTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: emulationRuleBindingTypeMappings,
};
