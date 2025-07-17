/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useState } from 'react';

export type SchemaType = 'ecs' | 'semconv';

const usePreferredSchema = () => {
  const [preferredSchema, setPreferredSchema] = useState<SchemaType>('semconv' as SchemaType);

  const updatePreferredSchema = useCallback((schema: SchemaType) => {
    console.log('Updating preferred schema to:', schema);
    setPreferredSchema(schema);
  }, []);
  console.log('Current preferred schema:', preferredSchema);
  return {
    preferredSchema,
    updatePreferredSchema,
  };
};

export const [PreferredSchemaProvider, usePreferredSchemaContext] =
  createContainer(usePreferredSchema);
