/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isHttpRepositoryUrl,
  normalizeRumAppSettings,
  rumAppSettingsBody,
  rumAppSettingsSoId,
} from './rum_app_settings';

describe('rumAppSettingsSoId', () => {
  it('keeps safe service names', () => {
    expect(rumAppSettingsSoId('session-replay-local')).toBe('session-replay-local');
  });

  it('hex-encodes names that are not URL-safe ids', () => {
    expect(rumAppSettingsSoId('shop/app')).toMatch(/^enc\./);
    expect(rumAppSettingsSoId('shop/app')).not.toContain('/');
  });
});

describe('normalizeRumAppSettings', () => {
  it('defaults branch to main and strips a leading slash on sourceRoot', () => {
    const settings = normalizeRumAppSettings('shop', {
      repositoryUrl: ' https://github.com/acme/shop ',
      sourceRoot: '/packages/shop',
    });
    expect(settings).toEqual({
      serviceName: 'shop',
      repositoryUrl: 'https://github.com/acme/shop',
      defaultBranch: 'main',
      sourceRoot: 'packages/shop',
      issueLabels: '',
    });
  });
});

describe('rumAppSettingsBody', () => {
  it('omits serviceName so PUT validation does not see an excess key', () => {
    expect(
      rumAppSettingsBody(
        normalizeRumAppSettings('kibana-pr-284540', {
          repositoryUrl: 'https://github.com/elastic/kibana',
        })
      )
    ).toEqual({
      repositoryUrl: 'https://github.com/elastic/kibana',
      defaultBranch: 'main',
      sourceRoot: '',
      issueLabels: '',
    });
  });
});

describe('isHttpRepositoryUrl', () => {
  it('allows empty and http(s) URLs', () => {
    expect(isHttpRepositoryUrl('')).toBe(true);
    expect(isHttpRepositoryUrl('https://github.com/acme/shop')).toBe(true);
    expect(isHttpRepositoryUrl('ftp://example.com/repo')).toBe(false);
    expect(isHttpRepositoryUrl('not-a-url')).toBe(false);
  });
});
