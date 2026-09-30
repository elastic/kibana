/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import {
  formatFlyoutTitle,
  GENERIC_ENTITY_TITLE,
  HOST_TITLE,
  SERVICE_TITLE,
  USER_TITLE,
} from '../shared/constants/flyout_titles';

export type ImpactEntityEngine = 'host' | 'user' | 'service' | 'generic';

/** Fields the investigation Impact row needs in order to open an entity flyout. */
export interface ImpactEntityChildTarget {
  id: string;
  name?: string;
  type?: string;
}

/** Scope id for entity panels opened from an investigation. Opaque to the panels. */
export const IMPACT_ENTITY_SCOPE_ID = 'alertzeroImpact';

/** Maps an Impact entity type onto a Flyout V2 entity panel. Anything else is generic. */
export const impactEntityEngineType = (type: string | undefined): ImpactEntityEngine => {
  switch (type?.toLowerCase()) {
    case 'host':
    case 'user':
    case 'service':
      return type.toLowerCase() as ImpactEntityEngine;
    default:
      return 'generic';
  }
};

const engineTitle = (engine: ImpactEntityEngine): string => {
  switch (engine) {
    case 'host':
      return HOST_TITLE;
    case 'user':
      return USER_TITLE;
    case 'service':
      return SERVICE_TITLE;
    default:
      return GENERIC_ENTITY_TITLE;
  }
};

/**
 * Child flyout options for an Impact entity. `session: 'inherit'` and the investigation history
 * key are what give the flyout a Back button to the investigation. Size stays a named size:
 * a numeric width throws for a child flyout.
 */
export const impactEntityChildFlyoutProperties = (
  entity: ImpactEntityChildTarget,
  historyKey: symbol
): OverlaySystemFlyoutOpenOptions => {
  const engine = impactEntityEngineType(entity.type);
  const label = entity.name ?? entity.id;

  return {
    session: 'inherit',
    historyKey,
    title: buildFlyoutNavTitle(formatFlyoutTitle(engineTitle(engine), label)),
    paddingSize: 'm',
    flyoutMenuDisplayMode: 'always',
    ownFocus: false,
    type: 'overlay',
    size: 's',
  };
};
