/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearch } from './helpers';
import { SecurityPageName } from '../../../app/types';
import type { AppLinkItems } from '../../links';
import { updateAppLinks } from '../../links';
import { mockGlobalState } from '../../mock';
import type { Capabilities } from '@kbn/core-capabilities-common';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

const defaultAppLinks: AppLinkItems = [
  {
    id: SecurityPageName.alerts,
    title: 'Alerts',
    path: '/alerts',
    skipUrlState: false,
  },
  {
    id: SecurityPageName.administration,
    title: 'Admin',
    path: '/admin',
    skipUrlState: true,
  },
];

const mockUpselling = new UpsellingService();
const mockUiSettingsClient = uiSettingsServiceMock.createStartContract();

describe('helpers', () => {
  beforeAll(() => {
    updateAppLinks(defaultAppLinks, {
      capabilities: {} as unknown as Capabilities,
      experimentalFeatures: mockGlobalState.app.enableExperimental,
      upselling: mockUpselling,
      uiSettingsClient: mockUiSettingsClient,
    });
  });
  it('returns the search string', () => {
    const globalQueryString = 'test=123';

    expect(getSearch(SecurityPageName.alerts, globalQueryString)).toEqual('?test=123');
  });

  it('returns an empty string when globalQueryString is empty', () => {
    const globalQueryString = '';

    expect(getSearch(SecurityPageName.alerts, globalQueryString)).toEqual('');
  });

  it('returns an empty string when the page does not require url state', () => {
    const globalQueryString = 'test=123';

    expect(getSearch(SecurityPageName.administration, globalQueryString)).toEqual('');
  });
});
