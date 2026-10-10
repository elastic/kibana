/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { TestProviders } from '../../../../common/mock';
import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../../../common/constants';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../types';
import {
  decodeFlyoutV2UrlParam,
  FLYOUT_V2_URL_PARAM,
} from '../../../shared/url_state/flyout_v2_url_param';
import {
  buildEntityAnalyticsFlyoutSearch,
  ENTITY_ANALYTICS_FLYOUT_COPY_LINK_TEST_ID,
  EntityAnalyticsFlyoutCopyLink,
} from './entity_analytics_flyout_copy_link';

const mockGetAppUrl = jest.fn(({ path }: { path?: string } = {}) => `/app/security${path ?? ''}`);

jest.mock('../../../../common/lib/kibana/hooks', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana/hooks');
  return {
    ...actual,
    useAppUrl: () => ({ getAppUrl: mockGetAppUrl }),
  };
});

const target = { kind: 'user' as const, userName: 'alice', entityId: 'user-1' };

describe('buildEntityAnalyticsFlyoutSearch', () => {
  it('encodes an entity flyout descriptor under the flyoutV2 param', () => {
    const search = buildEntityAnalyticsFlyoutSearch(target);
    const value = new URLSearchParams(search).get(FLYOUT_V2_URL_PARAM) ?? '';
    expect(decodeFlyoutV2UrlParam(value)).toEqual([
      { kind: 'user', userName: 'alice', entityId: 'user-1' },
    ]);
  });

  it('omits an empty entity id', () => {
    const search = buildEntityAnalyticsFlyoutSearch({ kind: 'host', hostName: 'web-01' });
    const value = new URLSearchParams(search).get(FLYOUT_V2_URL_PARAM) ?? '';
    expect(decodeFlyoutV2UrlParam(value)).toEqual([{ kind: 'host', hostName: 'web-01' }]);
  });
});

describe('EntityAnalyticsFlyoutCopyLink', () => {
  const renderLink = (newEntityAnalyticsPage: boolean) => {
    const startServices = createStartServicesMock();
    jest
      .mocked(startServices.featureFlags.useBooleanValue)
      .mockImplementation((flag, fallback) =>
        flag === USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG ? newEntityAnalyticsPage : fallback
      );

    return render(
      <TestProviders startServices={startServices as StartServices}>
        <EntityAnalyticsFlyoutCopyLink target={target} />
      </TestProviders>
    );
  };

  beforeEach(() => {
    mockGetAppUrl.mockClear();
  });

  it('renders nothing when the new entity analytics page flag is off', () => {
    const { container } = renderLink(false);
    expect(container).toBeEmptyDOMElement();
    expect(mockGetAppUrl).not.toHaveBeenCalled();
  });

  it('copies an absolute Entity Analytics URL with the flyout open when the flag is on', () => {
    renderLink(true);

    expect(screen.getByTestId(ENTITY_ANALYTICS_FLYOUT_COPY_LINK_TEST_ID)).toBeInTheDocument();
    expect(mockGetAppUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        deepLinkId: SecurityPageName.entityAnalyticsHomePage,
        path: expect.stringContaining(`${FLYOUT_V2_URL_PARAM}=`),
      })
    );
  });
});
