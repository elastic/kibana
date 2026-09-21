/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../../../../common/runtime_types';
import type { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { getMonitorForInspection } from './monitor_inspect';

describe('getMonitorForInspection', () => {
  const savedMonitor = {
    [ConfigKey.PARAMS]: '{"password":"saved"}',
  } as SyntheticsMonitor;
  const editedMonitor = {
    [ConfigKey.PARAMS]: '{"password":"edited"}',
  } as SyntheticsMonitor;

  it('uses edited parameter values after they have been revealed', () => {
    expect(
      getMonitorForInspection({
        monitorFields: editedMonitor,
        monitorWithRevealedParams: savedMonitor,
        useRevealedParams: false,
      })
    ).toBe(editedMonitor);
  });

  it('uses fetched parameter values while the form still holds placeholders', () => {
    expect(
      getMonitorForInspection({
        monitorFields: editedMonitor,
        monitorWithRevealedParams: savedMonitor,
        useRevealedParams: true,
      })
    ).toEqual({
      ...editedMonitor,
      [ConfigKey.PARAMS]: '{"password":"saved"}',
    });
  });
});
