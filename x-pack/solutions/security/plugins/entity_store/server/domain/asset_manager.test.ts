/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineDescriptor } from './definitions/saved_objects/engine_descriptor/constants';
import { ENGINE_STATUS, ENTITY_STORE_STATUS } from './constants';
import { getEntityStoreStatus } from './asset_manager';

const engineWithStatus = (status: EngineDescriptor['status']): EngineDescriptor =>
  ({
    status,
  } as EngineDescriptor);

describe('getEntityStoreStatus', () => {
  it('returns NOT_INSTALLED when there are no engines', () => {
    expect(getEntityStoreStatus([])).toBe(ENTITY_STORE_STATUS.NOT_INSTALLED);
  });

  describe('single engine', () => {
    it.each([
      [ENGINE_STATUS.ERROR, ENTITY_STORE_STATUS.ERROR],
      [ENGINE_STATUS.INSTALLING, ENTITY_STORE_STATUS.INSTALLING],
      [ENGINE_STATUS.STOPPED, ENTITY_STORE_STATUS.STOPPED],
      [ENGINE_STATUS.STARTED, ENTITY_STORE_STATUS.RUNNING],
      [ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.RUNNING],
    ])(
      'returns correct store status for engine status "%s"',
      (engineStatus, expectedStoreStatus) => {
        expect(getEntityStoreStatus([engineWithStatus(engineStatus)])).toBe(expectedStoreStatus);
      }
    );
  });

  describe('two unique engines', () => {
    it.each([
      // ERROR overrides everything
      [ENGINE_STATUS.ERROR, ENGINE_STATUS.ERROR, ENTITY_STORE_STATUS.ERROR],
      [ENGINE_STATUS.ERROR, ENGINE_STATUS.INSTALLING, ENTITY_STORE_STATUS.ERROR],
      [ENGINE_STATUS.ERROR, ENGINE_STATUS.STOPPED, ENTITY_STORE_STATUS.ERROR],
      [ENGINE_STATUS.ERROR, ENGINE_STATUS.STARTED, ENTITY_STORE_STATUS.ERROR],
      [ENGINE_STATUS.ERROR, ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.ERROR],
      // INSTALLING overrides non-error
      [ENGINE_STATUS.INSTALLING, ENGINE_STATUS.INSTALLING, ENTITY_STORE_STATUS.INSTALLING],
      [ENGINE_STATUS.INSTALLING, ENGINE_STATUS.STOPPED, ENTITY_STORE_STATUS.INSTALLING],
      [ENGINE_STATUS.INSTALLING, ENGINE_STATUS.STARTED, ENTITY_STORE_STATUS.INSTALLING],
      [ENGINE_STATUS.INSTALLING, ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.INSTALLING],
      // STOPPED only when all engines are stopped
      [ENGINE_STATUS.STOPPED, ENGINE_STATUS.STOPPED, ENTITY_STORE_STATUS.STOPPED],
      // Everything else falls through to RUNNING
      [ENGINE_STATUS.STOPPED, ENGINE_STATUS.STARTED, ENTITY_STORE_STATUS.RUNNING],
      [ENGINE_STATUS.STOPPED, ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.RUNNING],
      [ENGINE_STATUS.STARTED, ENGINE_STATUS.STARTED, ENTITY_STORE_STATUS.RUNNING],
      [ENGINE_STATUS.STARTED, ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.RUNNING],
      [ENGINE_STATUS.UPDATING, ENGINE_STATUS.UPDATING, ENTITY_STORE_STATUS.RUNNING],
    ])('engines [%s, %s] = %s', (statusA, statusB, expected) => {
      const engines = [engineWithStatus(statusA), engineWithStatus(statusB)];
      expect(getEntityStoreStatus(engines)).toBe(expected);
    });
  });
});
