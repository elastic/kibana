/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ReadStreamDefinition } from '@kbn/streams-schema';
import { isWiredReadStream } from '@kbn/streams-schema';
import { WiredStreamDetailManagement } from './wired';
import { ClassicStreamDetailManagement } from './classic';

export function StreamDetailManagement({
  definition,
  refreshDefinition,
  isLoadingDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
  isLoadingDefinition: boolean;
}) {
  if (!definition) {
    return null;
  }

  if (isWiredReadStream(definition)) {
    return (
      <WiredStreamDetailManagement
        definition={definition}
        refreshDefinition={refreshDefinition}
        isLoadingDefinition={isLoadingDefinition}
      />
    );
  }

  return (
    <ClassicStreamDetailManagement definition={definition} refreshDefinition={refreshDefinition} />
  );
}
