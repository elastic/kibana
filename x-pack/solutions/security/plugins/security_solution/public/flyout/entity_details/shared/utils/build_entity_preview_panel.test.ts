/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityPreviewPanel } from './build_entity_preview_panel';
import {
  EntityPanelKeyByType,
  GenericEntityPanelKey,
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../constants';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../../../document_details/preview/constants';

const scopeId = 'test-scope';
const entityId = 'entity-1';

const commonParams = {
  entityId,
  scopeId,
  isPreviewMode: true,
  banner: GENERIC_ENTITY_PREVIEW_BANNER,
  isEngineMetadataExist: true,
};

describe('buildEntityPreviewPanel', () => {
  it('builds the host panel with hostName', () => {
    expect(
      buildEntityPreviewPanel({ engineType: 'host', entityId, entityName: 'my-host', scopeId })
    ).toEqual({
      id: HostPanelKey,
      params: { ...commonParams, hostName: 'my-host' },
    });
  });

  it('builds the user panel with userName', () => {
    expect(
      buildEntityPreviewPanel({ engineType: 'user', entityId, entityName: 'my-user', scopeId })
    ).toEqual({
      id: UserPanelKey,
      params: { ...commonParams, userName: 'my-user' },
    });
  });

  it('builds the service panel with serviceName', () => {
    expect(
      buildEntityPreviewPanel({
        engineType: 'service',
        entityId,
        entityName: 'my-service',
        scopeId,
      })
    ).toEqual({
      id: ServicePanelKey,
      params: { ...commonParams, serviceName: 'my-service' },
    });
  });

  it('falls back to the generic panel with isEngineMetadataExist false when engineType is undefined', () => {
    expect(
      buildEntityPreviewPanel({ engineType: undefined, entityId, entityName: undefined, scopeId })
    ).toEqual({
      id: GenericEntityPanelKey,
      params: { ...commonParams, isEngineMetadataExist: false },
    });
  });

  it('falls back to the generic panel with isEngineMetadataExist true for an unknown engineType', () => {
    expect(
      buildEntityPreviewPanel({ engineType: 'unknown', entityId, entityName: 'x', scopeId })
    ).toEqual({
      id: GenericEntityPanelKey,
      params: commonParams,
    });
  });

  it('falls back to the generic panel for the generic engine type', () => {
    // The `generic` engine type is present in the lookup but maps to `undefined`, so it must fall
    // back to the generic entity panel (otherwise generic entities open nothing from the graph).
    expect(EntityPanelKeyByType.generic).toBeUndefined();
    expect(
      buildEntityPreviewPanel({ engineType: 'generic', entityId, entityName: 'x', scopeId })
    ).toEqual({
      id: GenericEntityPanelKey,
      params: commonParams,
    });
  });
});
