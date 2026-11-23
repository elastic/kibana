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

  it('grants show and save UI privileges and both API privileges to all, with the views to change', () => {
    expect(registerKibanaFeature.mock.calls[0][0].privileges.all).toEqual({
      app: ['digital_experience', 'kibana'],
      api: ['read_digital_experience', 'manage_digital_experience'],
      ui: ['show', 'save'],
      savedObject: { all: ['digital-experience-view'], read: ['digital-experience-view'] },
    });
  });

  it('grants setting up sessions only through a separate, all-spaces sub-feature privilege', () => {
    const [sessions] = registerKibanaFeature.mock.calls[0][0].subFeatures;
    expect(sessions.requireAllSpaces).toBe(true);
    expect(sessions.privilegeGroups).toEqual([
      {
        groupType: 'independent',
        privileges: [
          expect.objectContaining({
            id: 'manage_sessions',
            // Not part of `all`: it must be granted explicitly.
            includeIn: 'none',
            api: ['manage_digital_experience_sessions'],
            ui: ['manageSessions'],
          }),
        ],
      },
    ]);
  });

  it('grants creating short URLs through a sub-feature privilege that all includes', () => {
    const [, shortUrls] = registerKibanaFeature.mock.calls[0][0].subFeatures;
    expect(shortUrls.requireAllSpaces).toBeUndefined();
    expect(shortUrls.privilegeGroups).toEqual([
      {
        groupType: 'independent',
        privileges: [
          expect.objectContaining({
            id: 'url_create',
            // As in Discover and Dashboard: part of `all`, and taken off in a custom role.
            includeIn: 'all',
            ui: ['createShortUrl'],
            savedObject: { all: ['url'], read: [] },
          }),
        ],
      },
    ]);
  });

  it('grants only show and the read API privilege to read, and the views to apply', () => {
    expect(registerKibanaFeature.mock.calls[0][0].privileges.read).toEqual({
      app: ['digital_experience', 'kibana'],
      api: ['read_digital_experience'],
      ui: ['show'],
      savedObject: { all: [], read: ['digital-experience-view'] },
    });
  });
});
