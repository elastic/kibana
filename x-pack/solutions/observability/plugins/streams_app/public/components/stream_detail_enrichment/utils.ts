/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReadStreamDefinition, isWiredReadStream } from '@kbn/streams-schema';

export const getFieldsMapFromDefinition = (definition: ReadStreamDefinition) => {
  if (isWiredReadStream(definition)) {
    return Object.entries({
      ...definition.stream.ingest.wired.fields,
      ...definition.inherited_fields,
    }).map(([name, { type }]) => ({ name, type }));
  }

  return [];
};
