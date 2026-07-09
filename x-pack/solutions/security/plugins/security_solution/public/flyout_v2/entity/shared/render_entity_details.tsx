/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GRAPH_SCOPE_ID } from '@kbn/cloud-security-posture-graph';
import { Host } from '../host/main';
import { User } from '../user/main';
import { Service } from '../service/main';
import { GenericEntity } from '../generic/main';
import {
  formatFlyoutTitle,
  GENERIC_ENTITY_TITLE,
  HOST_TITLE,
  SERVICE_TITLE,
  USER_TITLE,
} from '../../shared/constants/flyout_titles';

export interface RenderEntityDetailsParams {
  /** Entity Store engine type of the entity to render (`host` | `user` | `service` | other → generic). */
  engineType: string | undefined;
  /** Canonical Entity Store v2 id (`entity.id`). */
  entityId: string;
  /** Display name of the entity (e.g. `host.name`). */
  entityName: string | undefined;
  /** Scope id for downstream containers and queries. */
  scopeId?: string;
}

/**
 * Maps an entity (as surfaced by the graph / resolution views) to the matching new-flyout entity
 * component, for rendering inside `overlays.openSystemFlyout`. Keeps entity-type branching in one
 * place so the graph tool and the entity flyouts share the same behavior.
 */
export const renderEntityDetails = ({
  engineType,
  entityId,
  entityName,
  scopeId = GRAPH_SCOPE_ID,
}: RenderEntityDetailsParams): React.ReactNode => {
  switch (engineType) {
    case 'host':
      return <Host hostName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
    case 'user':
      return <User userName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
    case 'service':
      return <Service serviceName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
    default:
      return <GenericEntity entityId={entityId} scopeId={scopeId} />;
  }
};

/**
 * Returns the flyout-history title for the entity {@link renderEntityDetails} would render,
 * in the format `"{Type}: {value}"` (e.g. `"Host: my-host"`), falling back to the entity id when
 * no display name is available. Kept alongside `renderEntityDetails` so both stay in sync for the
 * same `engineType` switch.
 */
export const getEntityFlyoutTitle = ({
  engineType,
  entityId,
  entityName,
}: Pick<RenderEntityDetailsParams, 'engineType' | 'entityId' | 'entityName'>): string => {
  const value = entityName ?? entityId;

  switch (engineType) {
    case 'host':
      return formatFlyoutTitle(HOST_TITLE, value);
    case 'user':
      return formatFlyoutTitle(USER_TITLE, value);
    case 'service':
      return formatFlyoutTitle(SERVICE_TITLE, value);
    default:
      return formatFlyoutTitle(GENERIC_ENTITY_TITLE, value);
  }
};
