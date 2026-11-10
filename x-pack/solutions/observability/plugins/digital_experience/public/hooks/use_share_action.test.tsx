/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';
import { DIGITAL_EXPERIENCE_LOCATOR_ID } from '../../common/locator';
import { getShareParams, useShareAction } from './use_share_action';
import { useKibanaServices } from './use_kibana_services';

jest.mock('./use_kibana_services');

const toggleShareContextMenu = jest.fn();
const locator = { id: DIGITAL_EXPERIENCE_LOCATOR_ID };
const get = jest.fn();

const useServices = ({
  hasLocator = true,
  createShortUrl = true,
}: { hasLocator?: boolean; createShortUrl?: boolean } = {}) => {
  get.mockReturnValue(hasLocator ? locator : undefined);
  jest.mocked(useKibanaServices).mockReturnValue({
    share: { toggleShareContextMenu, url: { locators: { get } } },
    application: { capabilities: { digital_experience: { show: true, createShortUrl } } },
  } as unknown as ReturnType<typeof useKibanaServices>);
};

const renderAction = (search: string, tab: 'overview' | 'sessions' = 'overview') =>
  renderHook(() => useShareAction({ serviceName: 'storefront-web', source: 'otel', tab }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[`/storefront-web${search}`]}>{children}</MemoryRouter>
    ),
  }).result.current;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getShareParams', () => {
  const base = { serviceName: 'storefront-web', source: 'otel', tab: 'overview' } as const;

  it('keeps the params the locator lists, as the URL has them, with the page it names', () => {
    expect(
      getShareParams({
        ...base,
        search: '?rangeFrom=now-3h&rangeTo=now&percentile=95&kuery=a%20%3A%20b&hasErrors=true',
      })
    ).toEqual({
      ...base,
      rangeFrom: 'now-3h',
      rangeTo: 'now',
      percentile: '95',
      kuery: 'a : b',
      hasErrors: 'true',
    });
  });

  it('leaves out what the locator does not list, and the empty and repeated params', () => {
    expect(
      getShareParams({
        ...base,
        search: '?_g=(time:(from:now-1y))&environment=&browser=a&browser=b',
      })
    ).toEqual(base);
  });
});

describe('useShareAction', () => {
  it('has no action without the locator', () => {
    useServices({ hasLocator: false });

    expect(renderAction('')).toBeUndefined();
  });

  it('opens the Share modal on the page of the URL, with its locator to make short URLs', async () => {
    useServices();
    const returnFocus = jest.fn();

    await renderAction('?rangeFrom=now-3h&rangeTo=now&environment=production', 'sessions')?.onClick(
      {
        returnFocus,
      }
    );

    const params = {
      serviceName: 'storefront-web',
      tab: 'sessions',
      source: 'otel',
      rangeFrom: 'now-3h',
      rangeTo: 'now',
      environment: 'production',
    };
    expect(toggleShareContextMenu).toHaveBeenCalledTimes(1);
    expect(toggleShareContextMenu.mock.calls[0][0]).toMatchObject({
      allowShortUrl: true,
      isDirty: false,
      objectType: 'digitalExperienceApplication',
      // Only the link: the app has no embeddable view.
      objectTypeMeta: { title: 'Share this application', config: { embed: { disabled: true } } },
      shareableUrlLocatorParams: { locator, params },
      sharingData: {
        title: 'storefront-web',
        locatorParams: { id: DIGITAL_EXPERIENCE_LOCATOR_ID, params },
      },
      onClose: returnFocus,
    });
  });

  it('offers short URLs, and the locator that makes them, only with the privilege to create them', async () => {
    useServices({ createShortUrl: false });

    await renderAction('?rangeFrom=now-3h&rangeTo=now')?.onClick({ returnFocus: jest.fn() });

    const [options] = toggleShareContextMenu.mock.calls[0];
    expect(options).toMatchObject({ allowShortUrl: false });
    // Without the locator the modal has no "Use absolute time range" switch, which a long link ignores.
    expect(options.shareableUrlLocatorParams).toBeUndefined();
    expect(options.sharingData.locatorParams.id).toBe(DIGITAL_EXPERIENCE_LOCATOR_ID);
  });
});
