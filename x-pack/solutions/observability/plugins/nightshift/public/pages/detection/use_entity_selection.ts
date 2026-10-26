/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const ENTITY_QUERY_PARAM = 'entity';
export const UNASSIGNED_QUERY_PARAM = 'unassigned';
export const MAX_SELECTED_ENTITIES = 100;

export interface EntitySelection {
  entities: string[];
  unassigned: boolean;
  toggleEntity: (id: string) => void;
  toggleUnassigned: () => void;
  clear: () => void;
}

export const useEntitySelection = (): EntitySelection => {
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const selectionKey = [...new Set(params.getAll(ENTITY_QUERY_PARAM))]
    .filter(Boolean)
    .slice(0, MAX_SELECTED_ENTITIES)
    .join('\0');
  const entities = useMemo(() => (selectionKey ? selectionKey.split('\0') : []), [selectionKey]);
  const unassigned = params.get(UNASSIGNED_QUERY_PARAM) === 'true';
  const update = useCallback(
    (nextEntities: string[], nextUnassigned: boolean) => {
      const next = new URLSearchParams(location.search);
      next.delete(ENTITY_QUERY_PARAM);
      nextEntities.forEach((id) => next.append(ENTITY_QUERY_PARAM, id));
      if (nextUnassigned) next.set(UNASSIGNED_QUERY_PARAM, 'true');
      else next.delete(UNASSIGNED_QUERY_PARAM);
      next.delete('page');
      history.push({ ...location, search: next.toString() });
    },
    [history, location]
  );

  return {
    entities,
    unassigned,
    toggleEntity: (id) => {
      if (entities.includes(id))
        update(
          entities.filter((selected) => selected !== id),
          unassigned
        );
      else if (entities.length < MAX_SELECTED_ENTITIES) update([...entities, id], unassigned);
    },
    toggleUnassigned: () => update(entities, !unassigned),
    clear: () => update([], false),
  };
};
