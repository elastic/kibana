/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serviceNameFromPath,
  uxAppPath,
  uxSessionIdFromPath,
  uxSettingsSuffix,
  uxSettingsTabFromPath,
  uxTabSuffix,
} from './ux_app_path';

describe('serviceNameFromPath', () => {
  it('reads the first segment when it is not a reserved tab', () => {
    expect(serviceNameFromPath('/weather-demo-app')).toBe('weather-demo-app');
    expect(serviceNameFromPath('/weather-demo-app/pages')).toBe('weather-demo-app');
    expect(serviceNameFromPath('/shop/session-replay/abc')).toBe('shop');
  });

  it('ignores reserved tab segments and the inventory path', () => {
    expect(serviceNameFromPath('/')).toBeUndefined();
    expect(serviceNameFromPath('/pages')).toBeUndefined();
    expect(serviceNameFromPath('/errors')).toBeUndefined();
    expect(serviceNameFromPath('/session-replay/abc')).toBeUndefined();
    expect(serviceNameFromPath('/settings')).toBeUndefined();
  });
});

describe('uxAppPath', () => {
  it('builds inventory and in-app paths', () => {
    expect(uxAppPath(undefined)).toBe('/');
    expect(uxAppPath('weather-demo-app')).toBe('/weather-demo-app');
    expect(uxAppPath('weather-demo-app', '/pages')).toBe('/weather-demo-app/pages');
    expect(uxAppPath('weather-demo-app', '/')).toBe('/weather-demo-app');
  });
});

describe('uxTabSuffix', () => {
  it('returns the tab or session suffix after the app', () => {
    expect(uxTabSuffix('/weather-demo-app')).toBe('');
    expect(uxTabSuffix('/weather-demo-app/pages')).toBe('/pages');
    expect(uxTabSuffix('/pages')).toBe('/pages');
    expect(uxTabSuffix('/')).toBe('');
  });

  it('keeps fleet settings suffixes so picking an app stays on that tab', () => {
    expect(uxTabSuffix('/settings/repository')).toBe('/settings/repository');
    expect(uxAppPath('shop', uxTabSuffix('/settings/repository'))).toBe(
      '/shop/settings/repository'
    );
  });
});

describe('uxSettingsSuffix', () => {
  it('opens repository settings when an app is selected', () => {
    expect(uxSettingsSuffix('shop')).toBe('/settings');
    expect(uxAppPath('shop', uxSettingsSuffix('shop'))).toBe('/shop/settings');
  });

  it('opens capture settings on the fleet page', () => {
    expect(uxSettingsSuffix()).toBe('/settings/capture');
    expect(uxAppPath(undefined, uxSettingsSuffix())).toBe('/settings/capture');
  });
});

describe('uxSettingsTabFromPath', () => {
  it('defaults to repository when an app is selected', () => {
    expect(uxSettingsTabFromPath('/shop/settings')).toBe('repository');
    expect(uxSettingsTabFromPath('/shop/settings/capture')).toBe('capture');
    expect(uxSettingsTabFromPath('/shop/settings/inject')).toBe('inject');
    expect(uxSettingsTabFromPath('/shop/settings/remote-clusters')).toBe('remote-clusters');
  });

  it('defaults to capture without an app', () => {
    expect(uxSettingsTabFromPath('/settings')).toBe('capture');
    expect(uxSettingsTabFromPath('/settings/inject')).toBe('inject');
    expect(uxSettingsTabFromPath('/settings/repository')).toBe('repository');
    expect(uxSettingsTabFromPath('/settings/remote-clusters')).toBe('remote-clusters');
  });
});

describe('uxSessionIdFromPath', () => {
  it('reads the id from both legacy and in-app session paths', () => {
    expect(uxSessionIdFromPath('/session-replay/abc-123')).toBe('abc-123');
    expect(uxSessionIdFromPath('/shop/session-replay/abc-123/replay')).toBe('abc-123');
    expect(uxSessionIdFromPath('/shop/session-replay')).toBeUndefined();
    expect(uxSessionIdFromPath('/shop/session-replay/settings')).toBeUndefined();
  });
});
