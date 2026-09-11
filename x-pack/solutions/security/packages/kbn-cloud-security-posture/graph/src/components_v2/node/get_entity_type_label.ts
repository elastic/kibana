/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { EntityNodeViewModel } from '../types';

const ENGINE_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  host: 'Host',
  service: 'Service',
  generic: 'Generic',
};

const ICON_ENTITY_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  storage: 'Host',
  desktop: 'Host',
  globe: 'IP',
};

const SHAPE_ENTITY_TYPE_LABELS: Record<EntityNodeDataModel['shape'], string> = {
  ellipse: 'User',
  hexagon: 'Host',
  pentagon: 'Role',
  diamond: 'IP',
  rectangle: 'Service',
};

interface EntityDocEntity {
  type?: string;
  engine_type?: string;
}

const getEntityFromDocuments = (
  documentsData?: EntityNodeViewModel['documentsData']
): EntityDocEntity | undefined => {
  const firstDoc = documentsData?.[0];
  if (!firstDoc?.entity) {
    return undefined;
  }
  return firstDoc.entity as EntityDocEntity;
};

/** Display label for the entity type subtitle on card nodes. */
export const getEntityTypeLabel = ({
  tag,
  icon,
  shape,
  documentsData,
}: Pick<EntityNodeViewModel, 'tag' | 'icon' | 'shape' | 'documentsData'>): string | undefined => {
  if (tag) {
    return tag;
  }

  const entity = getEntityFromDocuments(documentsData);
  if (entity?.type) {
    return entity.type;
  }

  if (entity?.engine_type) {
    return ENGINE_TYPE_LABELS[entity.engine_type];
  }

  if (icon) {
    const iconLabel = ICON_ENTITY_TYPE_LABELS[icon.toLowerCase()];
    if (iconLabel) {
      return iconLabel;
    }
  }

  if (shape) {
    return SHAPE_ENTITY_TYPE_LABELS[shape];
  }

  return undefined;
};
