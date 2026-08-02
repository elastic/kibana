/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndSchemaFormSchema } from '../../types';

/**
 * The values a schema seeds its form with, so the modal opens on the gate's own
 * suggested answer rather than on empty controls.
 *
 * Only `undefined` counts as "no default": `false`, `0`, and `''` are answers a
 * schema deliberately declared, and dropping them would silently change what
 * the analyst is shown.
 */
export const extractSchemaDefaults = (schema: PndSchemaFormSchema): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(schema.properties)
      .filter(([, field]) => field.default !== undefined)
      .map(([name, field]) => [name, field.default])
  );
