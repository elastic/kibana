/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Jest unit (L1): pure tests for `useOpenEntityPreviewPanel`.
 *
 * Pins the engine_type-to-panel-id dispatch and the per-engine name params
 * (`hostName` / `userName` / `serviceName`) so the orchestration is provable
 * without booting Kibana. The cross-package contract that the panel-id
 * strings emitted here actually resolve in the `security_solution` flyout
 * registry is the one signal these unit tests can't catch — that lives in
 * the sibling `entity_preview_flyout_smoke.ts`.
 */

import { renderHook } from '@testing-library/react';
import type { EntityDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { useOpenEntityPreviewPanel } from './use_open_entity_preview_panel';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../constants';

const mockOpenPreviewPanel = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openPreviewPanel: mockOpenPreviewPanel,
  }),
}));

const ENTITY_ID = 'entity-id-1';
const SCOPE_ID = 'scope-1';

const renderOpener = () => renderHook(() => useOpenEntityPreviewPanel()).result.current;

describe('useOpenEntityPreviewPanel', () => {
  beforeEach(() => {
    mockOpenPreviewPanel.mockClear();
  });

  describe('engine_type → panel id dispatch', () => {
    it('opens host-panel with hostName when engine_type is "host"', () => {
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        engine_type: 'host',
        name: 'host-instance-1',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(1);
      expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
        id: 'host-panel',
        params: expect.objectContaining({ hostName: 'host-instance-1' }),
      });
      const callArg = mockOpenPreviewPanel.mock.calls[0][0];
      expect(callArg.params).not.toHaveProperty('userName');
      expect(callArg.params).not.toHaveProperty('serviceName');
    });

    it('opens user-panel with userName when engine_type is "user"', () => {
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        engine_type: 'user',
        name: 'MvExpandTestActor',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(1);
      expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
        id: 'user-panel',
        params: expect.objectContaining({ userName: 'MvExpandTestActor' }),
      });
      const callArg = mockOpenPreviewPanel.mock.calls[0][0];
      expect(callArg.params).not.toHaveProperty('hostName');
      expect(callArg.params).not.toHaveProperty('serviceName');
    });

    it('opens service-panel with serviceName when engine_type is "service"', () => {
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        engine_type: 'service',
        name: 'ApiServiceAccount',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(1);
      expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
        id: 'service-panel',
        params: expect.objectContaining({ serviceName: 'ApiServiceAccount' }),
      });
      const callArg = mockOpenPreviewPanel.mock.calls[0][0];
      expect(callArg.params).not.toHaveProperty('hostName');
      expect(callArg.params).not.toHaveProperty('userName');
    });

    it('falls back to generic-entity-panel with no name param when engine_type is undefined', () => {
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        name: 'MvExpandTargetStorage',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(1);
      expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
        id: 'generic-entity-panel',
        params: expect.any(Object),
      });
      const callArg = mockOpenPreviewPanel.mock.calls[0][0];
      expect(callArg.params).not.toHaveProperty('hostName');
      expect(callArg.params).not.toHaveProperty('userName');
      expect(callArg.params).not.toHaveProperty('serviceName');
    });

    it('does NOT open any panel when engine_type is "generic" (pins current behavior; tracks a latent bug)', () => {
      // `EntityPanelKeyByType['generic']` is intentionally `undefined` per the
      // `// TODO create generic flyout?` comment in ../constants. The hook's
      // `if (!panelId) return` short-circuits and no preview panel opens. A
      // user clicking a 'generic' engine_type entity gets nothing today —
      // worth raising as a separate bug.
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        engine_type: 'generic',
        name: 'GenericEntity',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).not.toHaveBeenCalled();
    });
  });

  describe('common preview params', () => {
    it('passes entityId, scopeId, isPreviewMode, the generic preview banner, and isEngineMetadataExist on every successful open', () => {
      const open = renderOpener();
      const entity: EntityDocumentDataModel = {
        engine_type: 'host',
        name: 'host-x',
        availableInEntityStore: true,
      };

      open(ENTITY_ID, SCOPE_ID, entity);

      expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
        id: 'host-panel',
        params: {
          entityId: ENTITY_ID,
          scopeId: SCOPE_ID,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
          hostName: 'host-x',
        },
      });
    });
  });
});
