/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';
import type { PndSchemaFormFieldSchema, PndSchemaFormSchema } from '../../types';

/**
 * A required field is unanswered when it holds nothing — with one carve-out.
 *
 * **A boolean is never unanswered.** An unchecked switch is a legitimate
 * `false`, not a missing value, so demanding that the analyst toggle it on
 * would make "no" unsubmittable.
 */
const isUnanswered = (field: PndSchemaFormFieldSchema | undefined, value: unknown): boolean => {
  if (field?.type === 'boolean') return false;

  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
};

/**
 * Which required fields the analyst has not answered yet, as a
 * `fieldName -> message` map the form renders in place.
 *
 * Required-only by design. Everything else the gate cares about — the
 * rationale's length bound, the closed decision enum, the non-empty trim — is
 * enforced by `_respond`'s zod contract, and re-implementing it here would be a
 * second source of truth that can drift.
 */
export const validateSchemaValues = (
  schema: PndSchemaFormSchema,
  values: Record<string, unknown>
): Record<string, string> =>
  Object.fromEntries(
    (schema.required ?? [])
      .filter((name) => isUnanswered(schema.properties[name], values[name]))
      .map((name) => [name, i18n.REQUIRED_FIELD_ERROR])
  );
