/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiForm } from '@elastic/eui';

import { SchemaFormField } from './schema_form_field';
import type { PndSchemaFormSchema } from './types';

export interface SchemaFormProps {
  disabled?: boolean;
  /** Validation messages keyed by property name. @see validateSchemaValues */
  errors?: Record<string, string | undefined>;
  /** Reports the whole answer set, so the caller owns the values. */
  onChange: (values: Record<string, unknown>) => void;
  /** Already narrowed by {@link canRenderWithSchemaForm}. */
  schema: PndSchemaFormSchema;
  values: Record<string, unknown>;
}

/**
 * The controls a HITL gate's own `inputSchema` asks for.
 *
 * PND's four gates all ask for `{ decision, rationale }` today, which this
 * renders as a select plus a text field — the same two controls the fixed
 * dialog drew by hand. The point is what happens when a gate asks for something
 * else: a new field in a watch's `waitForInput` schema reaches the analyst
 * without a UI change, and `_respond` already forwards it verbatim to the
 * orchestrator (`.catchall(z.unknown())`).
 *
 * A controlled component: it holds no state, and reports the full value map on
 * every keystroke so the caller can validate and submit it.
 *
 * Ported from `inbox/public/pages/inbox_actions/components/schema_form.tsx`,
 * which is unexported. Per epic decision **D6** the logic is copied rather than
 * shared — `@kbn/workflows-hitl-form` does not exist in this repo, and creating
 * it would be a platform change this slice forbids.
 */
export const SchemaForm: React.FC<SchemaFormProps> = ({
  disabled = false,
  errors = {},
  onChange,
  schema,
  values,
}) => {
  const properties = useMemo(() => Object.entries(schema.properties), [schema]);
  const requiredNames = useMemo(() => new Set(schema.required ?? []), [schema]);

  // Unreachable through `canRenderWithSchemaForm`, which rejects a schema with
  // no properties precisely so the caller falls back to its fixed controls.
  if (properties.length === 0) return null;

  return (
    <EuiForm component="div" data-test-subj="pndSchemaForm">
      {properties.map(([name, field]) => (
        <SchemaFormField
          disabled={disabled}
          error={errors[name]}
          field={field}
          isRequired={requiredNames.has(name)}
          key={name}
          name={name}
          onChange={(next) => {
            const { [name]: removed, ...rest } = values;

            onChange(next === undefined ? rest : { ...rest, [name]: next });
          }}
          value={values[name]}
        />
      ))}
    </EuiForm>
  );
};

export { canRenderWithSchemaForm } from './helpers/can_render_with_schema_form';
export { extractSchemaDefaults } from './helpers/extract_schema_defaults';
export { PND_SCHEMA_FORM_CONTROLS, resolveFieldControl } from './helpers/resolve_field_control';
export type { PndSchemaFormControl } from './helpers/resolve_field_control';
export { validateSchemaValues } from './helpers/validate_schema_values';
export { MAX_SCHEMA_STRING_LENGTH, SchemaFormField } from './schema_form_field';
export type { SchemaFormFieldProps } from './schema_form_field';
export { PND_SCHEMA_FORM_FIELD_TYPES } from './types';
export type {
  PndSchemaFormEnumMember,
  PndSchemaFormFieldSchema,
  PndSchemaFormFieldType,
  PndSchemaFormSchema,
} from './types';
