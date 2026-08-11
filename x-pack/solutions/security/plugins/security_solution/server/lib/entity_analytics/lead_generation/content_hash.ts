/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

export const computeEntityIdentityKey = ({
  entities,
}: {
  entities: ReadonlyArray<{ type: string; id?: string; name: string }>;
}) => {
  const sortedEntities = [...entities]
    .map((e) => ({ type: e.type, key: e.id ?? e.name }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key));

  return createHash('sha256')
    .update(JSON.stringify({ entities: sortedEntities }))
    .digest('hex');
};

export const computeContentHash = ({
  observations,
}: {
  observations: ReadonlyArray<{ moduleId: string; type: string }>;
}) => {
  const distinctSignals = [...new Set(observations.map((o) => `${o.moduleId}:${o.type}`))].sort();

  return createHash('sha256')
    .update(JSON.stringify({ signals: distinctSignals }))
    .digest('hex');
};
