/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { classicNavigationFactory } from './classic_navigation';
import { ClassicNavItem } from './types';

describe('classicNavigationFactory', function () {
  const mockedNavLinks: Array<Partial<ChromeNavLink>> = [
    {
      id: 'searchHomepage',
      url: '/app/elasticsearch/home',
      title: 'Home',
    },
    {
      id: 'enterpriseSearchContent:connectors',
      title: 'Connectors',
      url: '/app/elasticsearch/content/connectors',
    },
    {
      id: 'enterpriseSearchContent:webCrawlers',
      title: 'Web Crawlers',
      url: '/app/elasticsearch/content/crawlers',
    },
  ];
  const mockedCoreStart = {
    chrome: {
      navLinks: {
        getAll: () => mockedNavLinks,
      },
    },
  };
  const core = mockedCoreStart as unknown as CoreStart;
  const mockHistory = {
    location: {
      pathname: '/',
    },
    createHref: jest.fn(),
  };
  const history = mockHistory as unknown as ScopedHistory;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.location.pathname = '/';
    mockHistory.createHref.mockReturnValue('/');
  });

  it('can render top-level items', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'searchHomepage',
        },
      },
    ];
    expect(classicNavigationFactory(items, core, history)).toEqual({
      icon: 'logoElasticsearch',
      items: [
        {
          href: '/app/elasticsearch/home',
          id: 'unit-test',
          isSelected: false,
          name: 'Home',
          onClick: expect.any(Function),
        },
      ],
      name: 'Elasticsearch',
    });
  });

  it('will set isSelected', () => {
    mockHistory.location.pathname = '/overview';
    mockHistory.createHref.mockReturnValue('/app/elasticsearch/home');

    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'searchHomepage',
        },
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/elasticsearch/home',
        id: 'unit-test',
        isSelected: true,
        name: 'Home',
        onClick: expect.any(Function),
      },
    ]);
  });
  it('can render items with children', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'searchContent',
        name: 'Content',
        items: [
          {
            id: 'searchConnectors',
            deepLink: {
              link: 'enterpriseSearchContent:connectors',
            },
          },
        ],
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        id: 'searchContent',
        items: [
          {
            href: '/app/elasticsearch/content/connectors',
            id: 'searchConnectors',
            isSelected: false,
            name: 'Connectors',
            onClick: expect.any(Function),
          },
        ],
        name: 'Content',
      },
    ]);
  });
  it('returns name if provided over the deeplink title', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'searchConnectors',
        deepLink: {
          link: 'enterpriseSearchContent:connectors',
        },
        name: 'Date connectors',
      },
    ];
    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/elasticsearch/content/connectors',
        id: 'searchConnectors',
        isSelected: false,
        name: 'Date connectors',
        onClick: expect.any(Function),
      },
    ]);
  });
  it('removes item if deeplink not defined', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'searchHomepage',
        },
      },
      {
        id: 'serverlessElasticsearch',
        deepLink: {
          link: 'serverlessElasticsearch',
        },
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/elasticsearch/home',
        id: 'unit-test',
        isSelected: false,
        name: 'Home',
        onClick: expect.any(Function),
      },
    ]);
  });
});
