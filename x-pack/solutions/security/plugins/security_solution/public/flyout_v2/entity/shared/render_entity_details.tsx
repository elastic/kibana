/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GRAPH_SCOPE_ID } from '@kbn/cloud-security-posture-graph';
import type { FlyoutType } from '../../../common/lib/telemetry';
import { Host } from '../host/main';
import { User } from '../user/main';
import { Service } from '../service/main';
import { GenericEntity } from '../generic/main';

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
 * Maps an Entity Store engine type to the v2 flyout telemetry `FlyoutType`, mirroring the
 * component mapping in `renderEntityDetails` above. Used by the entity `main` components to tag
 * `onShowRelatedEntity` opens (which can resolve to any entity type) with the right `flyoutType`.
 */
export const entityEngineTypeToFlyoutType = (engineType: string | undefined): FlyoutType => {
  switch (engineType) {
    case 'host':
      return 'host';
    case 'user':
      return 'user';
    case 'service':
      return 'service';
    default:
      return 'generic';
  }
};
