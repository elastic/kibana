/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import {
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_SOURCE_SO_TYPE,
  NIGHTSHIFT_UI_PRIVILEGES,
} from '@kbn/nightshift-shared';
import { registerNightshiftFeature } from './register_feature';

const getRegisteredFeature = (): KibanaFeatureConfig => {
  const features = featuresPluginMock.createSetup();
  registerNightshiftFeature(features);
  return features.registerKibanaFeature.mock.calls[0][0];
};

describe('registerNightshiftFeature', () => {
  it('grants source and rule saved-object writes with `all`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.all.savedObject).toEqual({
      all: [NIGHTSHIFT_SOURCE_SO_TYPE, 'alerting_rule'],
      read: [],
    });
  });

  it('grants only source and rule saved-object reads with `read`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.read.savedObject).toEqual({
      all: [],
      read: [NIGHTSHIFT_SOURCE_SO_TYPE, 'alerting_rule'],
    });
  });

  it('keeps UI capabilities limited to Nightshift', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.all.ui).toEqual([
      NIGHTSHIFT_UI_PRIVILEGES.show,
      NIGHTSHIFT_UI_PRIVILEGES.manage,
    ]);
    expect(privileges?.read.ui).toEqual([NIGHTSHIFT_UI_PRIVILEGES.show]);
  });

  it('grants the agentic investigations and proposals API privileges with `all`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.all.api).toEqual([
      NIGHTSHIFT_API_PRIVILEGES.read,
      NIGHTSHIFT_API_PRIVILEGES.manage,
      'read_investigations',
      'manage_investigations',
      'read_proposals',
      'manage_proposals',
    ]);
  });

  it('grants only the investigations and proposals read API privileges with `read`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.read.api).toEqual([
      NIGHTSHIFT_API_PRIVILEGES.read,
      'read_investigations',
      'read_proposals',
    ]);
  });

  it('grants alerts read with both `all` and `read`', () => {
    const { privileges } = getRegisteredFeature();

    expect(privileges?.all.alerts).toEqual({ read: true });
    expect(privileges?.read.alerts).toEqual({ read: true });
  });
});
