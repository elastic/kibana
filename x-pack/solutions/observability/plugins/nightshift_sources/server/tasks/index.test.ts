/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_SOURCE_SO_TYPE } from '../saved_objects/nightshift_source_saved_object';
import { plugin } from '.';
import { nightshiftSourcesBridge } from './bridge';

describe('nightshift sources tasks entry', () => {
  it('registers the saved object type and builds a sources client in a pod', async () => {
    const instance = await plugin(coreMock.createPluginInitializerContext());
    const registerType = jest.fn();

    const setup = instance.setup({ savedObjects: { registerType } } as never);
    expect(registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: NIGHTSHIFT_SOURCE_SO_TYPE })
    );
    expect(setup.onSourceChange).toEqual(expect.any(Function));

    const start = instance.start(coreMock.createStart() as never);
    expect(start.getSourcesClient).toEqual(expect.any(Function));
  });

  it('hands out the plugin contracts when the server entry ran in this process', async () => {
    const real = { onSourceChange: jest.fn() };
    nightshiftSourcesBridge.setSetup(real);
    try {
      const instance = await plugin(coreMock.createPluginInitializerContext());
      const registerType = jest.fn();

      expect(instance.setup({ savedObjects: { registerType } } as never)).toBe(real);
      expect(registerType).not.toHaveBeenCalled();
    } finally {
      nightshiftSourcesBridge.setSetup(undefined as never);
    }
  });
});
