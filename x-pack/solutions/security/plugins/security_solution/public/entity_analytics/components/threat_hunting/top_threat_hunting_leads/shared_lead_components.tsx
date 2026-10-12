/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityBadge } from '../../entity_badge';

export { EntityBadge };

export const renderTextWithEntity = (
  text: string,
  entity: { type: string; name: string; id: string },
  scopeId: string
): React.ReactNode => {
  const typeLabel = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
  const withPrefix = `${typeLabel} ${entity.name}`;
  let start = text.indexOf(withPrefix);
  let end = start + withPrefix.length;

  if (start === -1) {
    start = text.indexOf(entity.name);
    end = start + entity.name.length;
  }

  if (start === -1) return text;

  return (
    <>
      {start > 0 && text.slice(0, start)}
      <EntityBadge entity={entity} scopeId={scopeId} />
      {end < text.length && text.slice(end)}
    </>
  );
};
