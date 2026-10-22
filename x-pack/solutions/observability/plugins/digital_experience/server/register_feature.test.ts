/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerDigitalExperienceFeature } from './register_feature';

describe('registerDigitalExperienceFeature', () => {
  const registerKibanaFeature = jest.fn();

  beforeEach(() => {
    registerKibanaFeature.mockClear();
    registerDigitalExperienceFeature({ registerKibanaFeature } as unknown as FeaturesPluginSetup);
  });

  it('registers a single observability feature with the digital_experience id', () => {
    expect(registerKibanaFeature).toHaveBeenCalledTimes(1);
    expect(registerKibanaFeature.mock.calls[0][0]).toMatchObject({
      id: 'digital_experience',
      category: DEFAULT_APP_CATEGORIES.observability,
      app: ['digital_experience', 'kibana'],
    });
  });

  it('tells admins that the APM privilege is also required', () => {
    expect(registerKibanaFeature.mock.calls[0][0].privilegesTooltip).toContain(
      'APM and User Experience'
    );
  });

  it('grants show and save UI privileges and both API privileges to all', () => {
    expect(registerKibanaFeature.mock.calls[0][0].privileges.all).toEqual({
      app: ['digital_experience', 'kibana'],
      api: ['read_digital_experience', 'manage_digital_experience'],
      ui: ['show', 'save'],
      savedObject: { all: [], read: [] },
    });
  });

  it('grants only show and the read API privilege to read', () => {
    expect(registerKibanaFeature.mock.calls[0][0].privileges.read).toEqual({
      app: ['digital_experience', 'kibana'],
      api: ['read_digital_experience'],
      ui: ['show'],
      savedObject: { all: [], read: [] },
    });
  });
});
