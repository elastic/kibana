/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createMemoryHistory } from 'history';
import { mountObservabilityAlertingApp } from './mount';

describe('mountObservabilityAlertingApp', () => {
  it('renders into the mount element and unmounts', () => {
    const coreStart = coreMock.createStart();
    const params = coreMock.createAppMountParameters();
    const history = createMemoryHistory({ initialEntries: ['/inbox'] });
    params.history = history as unknown as typeof params.history;

    const unmount = mountObservabilityAlertingApp({
      coreStart,
      params,
    });

    expect(params.element.className).toContain('kbnAppWrapper');
    expect(params.element.childElementCount).toBeGreaterThan(0);

    unmount();
    expect(params.element.childElementCount).toBe(0);
  });
});
