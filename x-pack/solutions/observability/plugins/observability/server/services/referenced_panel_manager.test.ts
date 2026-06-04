/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { ReferencedPanelManager } from './referenced_panel_manager';

const createLoggerMock = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

describe('ReferencedPanelManager', () => {
  const DASHBOARD_ID = 'dashboard-1';
  const PANEL_UID = 'panel-uid-1';
  const PANEL_SO_ID = 'panel-so-1';
  const LENS_SAVED_OBJECT_TYPE = 'lens';

  let logger: jest.Mocked<Logger>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let manager: ReferencedPanelManager;

  beforeEach(() => {
    logger = createLoggerMock();
    soClient = savedObjectsClientMock.create();
    manager = new ReferencedPanelManager(logger, soClient);
  });

  describe('addReferencedPanel', () => {
    it('matches a Lens reference whose saved object type is "lens" against a panel whose embeddable type is "vis"', () => {
      // This is the post-#260040 shape: dashboard API returns panel.type='vis'
      // while the dashboard saved object references still carry type='lens'
      // (the saved object content type, which did not change).
      manager.addReferencedPanel({
        dashboardId: DASHBOARD_ID,
        panel: { id: PANEL_UID, type: LENS_EMBEDDABLE_TYPE } as DashboardPanel,
        references: [
          { name: `${PANEL_UID}:savedObjectRef`, type: LENS_SAVED_OBJECT_TYPE, id: PANEL_SO_ID },
        ],
      });

      expect(logger.error).not.toHaveBeenCalled();
      // @ts-expect-error private member access for testing
      expect(manager.panelUidToId.get(PANEL_UID)).toBe(PANEL_SO_ID);
      // The stored type must be the saved object type so that the subsequent
      // bulkGet call addresses the correct content type.
      // @ts-expect-error private member access for testing
      expect(manager.panelsTypeById.get(PANEL_SO_ID)).toBe(LENS_SAVED_OBJECT_TYPE);
    });

    it('logs an error and skips the panel when no matching reference exists at all', () => {
      manager.addReferencedPanel({
        dashboardId: DASHBOARD_ID,
        panel: { id: PANEL_UID, type: LENS_EMBEDDABLE_TYPE } as DashboardPanel,
        references: [
          {
            name: 'other-uid:savedObjectRef',
            type: LENS_SAVED_OBJECT_TYPE,
            id: 'other-so-id',
          },
        ],
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Reference for panel of type ${LENS_EMBEDDABLE_TYPE} (saved object type ${LENS_SAVED_OBJECT_TYPE}) and uid ${PANEL_UID}`
        )
      );
      // @ts-expect-error private member access for testing
      expect(manager.panelUidToId.size).toBe(0);
      // @ts-expect-error private member access for testing
      expect(manager.panelsTypeById.size).toBe(0);
    });

    it('does nothing when the panel has no uid', () => {
      manager.addReferencedPanel({
        dashboardId: DASHBOARD_ID,
        panel: { type: LENS_EMBEDDABLE_TYPE } as DashboardPanel,
        references: [
          { name: 'whatever:savedObjectRef', type: LENS_SAVED_OBJECT_TYPE, id: PANEL_SO_ID },
        ],
      });

      expect(logger.error).not.toHaveBeenCalled();
      // @ts-expect-error private member access for testing
      expect(manager.panelUidToId.size).toBe(0);
    });

    it('passes the panel embeddable type through unchanged when there is no saved object alias', () => {
      // For an embeddable type with no mapping in the translation table (e.g.
      // a hypothetical "search" embeddable), we expect the saved object type
      // to fall back to the embeddable type, preserving prior behavior.
      const SEARCH_TYPE = 'search';

      manager.addReferencedPanel({
        dashboardId: DASHBOARD_ID,
        panel: { id: PANEL_UID, type: SEARCH_TYPE } as DashboardPanel,
        references: [{ name: `${PANEL_UID}:savedObjectRef`, type: SEARCH_TYPE, id: PANEL_SO_ID }],
      });

      expect(logger.error).not.toHaveBeenCalled();
      // @ts-expect-error private member access for testing
      expect(manager.panelsTypeById.get(PANEL_SO_ID)).toBe(SEARCH_TYPE);
    });
  });

  describe('fetchReferencedPanels', () => {
    it('calls bulkGet with the saved object type stored by addReferencedPanel', async () => {
      manager.addReferencedPanel({
        dashboardId: DASHBOARD_ID,
        panel: { id: PANEL_UID, type: LENS_EMBEDDABLE_TYPE } as DashboardPanel,
        references: [
          { name: `${PANEL_UID}:savedObjectRef`, type: LENS_SAVED_OBJECT_TYPE, id: PANEL_SO_ID },
        ],
      });

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: PANEL_SO_ID,
            type: LENS_SAVED_OBJECT_TYPE,
            attributes: { title: 'Some Lens' },
            references: [],
          } as any,
        ],
      });

      await manager.fetchReferencedPanels();

      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: PANEL_SO_ID, type: LENS_SAVED_OBJECT_TYPE },
      ]);
      expect(manager.getByUid(PANEL_UID)).toEqual({
        title: 'Some Lens',
        references: [],
      });
    });
  });
});
