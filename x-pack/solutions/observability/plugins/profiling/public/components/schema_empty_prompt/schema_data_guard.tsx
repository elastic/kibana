/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useProfilingSchema } from '../contexts/profiling_schema/use_profiling_schema';
import { SchemaEmptyPrompt } from '.';

/**
 * Renders its children unless the selected schema is known to have no data, in which case an empty
 * prompt is rendered instead. While the schemas with data are unknown, children are rendered.
 */
export function SchemaDataGuard({ children }: { children?: React.ReactElement }) {
  const { schema, schemas } = useProfilingSchema();

  if (schema && schemas && !schemas.includes(schema)) {
    return <SchemaEmptyPrompt />;
  }

  return children ?? null;
}
