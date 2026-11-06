/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EntityPanelKeyByType, GenericEntityPanelKey } from '../constants';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../../../document_details/preview/constants';

export interface BuildEntityPreviewPanelArgs {
  /** Entity Store engine type (`host` / `user` / `service` / undefined for generic). */
  engineType: string | undefined;
  /** Entity Store v2 entity ID (`entity.id`). */
  entityId: string;
  /** Display name used to populate the type-specific name param. */
  entityName: string | undefined;
  /** Scope ID for the preview panel. */
  scopeId: string;
}

/**
 * Builds the expandable-flyout preview-panel descriptor for an entity node clicked in the graph.
 * Returns `undefined` when the engine type maps to no panel.
 *
 * This is flyout-agnostic: it only computes the panel id and params. The caller owns how the
 * preview is opened (e.g. `openPreviewPanel`), which is why the logic lives here rather than in a
 * shared hook.
 */
export const buildEntityPreviewPanel = ({
  engineType,
  entityId,
  entityName,
  scopeId,
}: BuildEntityPreviewPanelArgs): FlyoutPanelProps | undefined => {
  const id =
    engineType && engineType in EntityPanelKeyByType
      ? // `EntityPanelKeyByType[generic]` is `undefined` (no dedicated generic key), so fall back to
        // the generic entity panel — otherwise generic entities open nothing from the graph.
        EntityPanelKeyByType[engineType as keyof typeof EntityPanelKeyByType] ??
        GenericEntityPanelKey
      : GenericEntityPanelKey;

  if (!id) {
    return undefined;
  }

  const nameParam =
    engineType === 'host'
      ? { hostName: entityName }
      : engineType === 'user'
      ? { userName: entityName }
      : engineType === 'service'
      ? { serviceName: entityName }
      : {};

  return {
    id,
    params: {
      entityId,
      scopeId,
      isPreviewMode: true,
      banner: GENERIC_ENTITY_PREVIEW_BANNER,
      // Only the generic entity panel reads this — when the engine type is missing it should
      // surface the "EngineMetadata.Type is missing" error rather than attempt to load.
      // Mirrors the asset-inventory flyout (`Boolean(entityType)`).
      isEngineMetadataExist: Boolean(engineType),
      ...nameParam,
    },
  };
};
