/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { registerFeature } from './feature';

describe('registerFeature', () => {
  it('grants manage and read API privileges to all, and only read to read', () => {
    const features = featuresPluginMock.createSetup();
    registerFeature(features);

    const [feature] = features.registerKibanaFeature.mock.calls[0];
    expect(feature.id).toBe('featureFlagsManagement');
    expect(feature.app).toEqual(['featureFlagsManagement']);
    expect(feature.privileges?.all).toEqual(
      expect.objectContaining({
        api: ['manage_feature_flags', 'read_feature_flags'],
        ui: ['show', 'save'],
        savedObject: { all: [], read: [] },
      })
    );
    expect(feature.privileges?.read).toEqual(
      expect.objectContaining({
        api: ['read_feature_flags'],
        ui: ['show'],
        savedObject: { all: [], read: [] },
      })
    );
  });
});
