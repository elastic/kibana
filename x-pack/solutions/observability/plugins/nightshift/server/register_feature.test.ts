/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { registerNightshiftFeature } from './register_feature';

const getRegisteredFeature = (): KibanaFeatureConfig => {
  const features = featuresPluginMock.createSetup();
  registerNightshiftFeature(features);
  return features.registerKibanaFeature.mock.calls[0][0];
};

describe('registerNightshiftFeature', () => {
  it('grants the agentic investigations and proposals API privileges with `all`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.all.api).toEqual([
      NIGHTSHIFT_API_PRIVILEGES.read,
      NIGHTSHIFT_API_PRIVILEGES.manage,
      'manage_investigations',
      'read_proposals',
      'manage_proposals',
    ]);
  });

  it('grants only the proposals read API privilege with `read`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.read.api).toEqual([NIGHTSHIFT_API_PRIVILEGES.read, 'read_proposals']);
  });
});
