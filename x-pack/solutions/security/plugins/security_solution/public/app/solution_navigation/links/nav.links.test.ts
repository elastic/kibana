/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeNavLink } from '@kbn/core/public';
import { APP_UI_ID } from '../../../../common';
import type { NavigationLink } from '@kbn/security-solution-navigation';
import { ExternalPageName, SecurityPageName } from '@kbn/security-solution-navigation';
import { coreMock } from '@kbn/core/public/mocks';
import { createSolutionNavLinks$ } from './nav_links';
import type { Observable } from 'rxjs';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { mlNavCategories, mlNavLinks } from './sections/ml_links';
import { assetsNavLinks } from './sections/assets_links';
import { investigationsNavLinks } from './sections/investigations_links';

const mockChromeNavLinks = jest.fn((): ChromeNavLink[] => []);
const mockChromeGetNavLinks = jest.fn(() => new BehaviorSubject(mockChromeNavLinks()));
const mockChromeNavLinksHas = jest.fn((id: string): boolean =>
  mockChromeNavLinks().some((link) => link.id === id)
);

const coreStartMock = coreMock.createStart();
const testServices = {
  ...coreStartMock,
  chrome: {
    ...coreStartMock.chrome,
    navLinks: {
      ...coreStartMock.chrome.navLinks,
      has: mockChromeNavLinksHas,
      getNavLinks$: mockChromeGetNavLinks,
    },
  },
};

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;

const link1: NavigationLink<SecurityPageName> = { id: link1Id, title: 'link 1' };
const link2: NavigationLink<SecurityPageName> = { id: link2Id, title: 'link 2' };
const linkMlLanding: NavigationLink<SecurityPageName> = {
  id: SecurityPageName.mlLanding,
  title: 'ML Landing',
  links: [],
};

const chromeNavLink1: ChromeNavLink = {
  id: `${APP_UI_ID}:${link1.id}`,
  title: link1.title,
  href: '/link1',
  url: '/link1',
  baseUrl: '',
  visibleIn: [],
};
const devToolsChromeNavLink: ChromeNavLink = {
  id: 'dev_tools',
  title: 'Dev tools',
  href: '/dev_tools',
  url: '/dev_tools',
  baseUrl: '',
  visibleIn: [],
};

const createTestProjectNavLinks = async (
  testSecurityNavLinks$: Observable<Array<NavigationLink<SecurityPageName>>>
) => {
  const projectNavLinks$ = createSolutionNavLinks$(testSecurityNavLinks$, testServices);
  return firstValueFrom(projectNavLinks$.pipe(take(1)));
};

describe('getProjectNavLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeNavLinks.mockReturnValue([chromeNavLink1]);
    mockChromeNavLinksHas.mockImplementation((id: string): boolean =>
      mockChromeNavLinks().some((link) => link.id === id)
    );
  });

  it('should return security nav links with all external (non cloud) links filtered', async () => {
    mockChromeNavLinksHas.mockReturnValue(false); // no external links exist
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual([link1, link2]);
  });

  it('should filter all external links not configured in chrome links', async () => {
    mockChromeNavLinks.mockReturnValue([chromeNavLink1]);
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2, linkMlLanding]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual([
      link1,
      link2,
      expect.objectContaining({ id: SecurityPageName.mlLanding, links: [] }),
    ]);
  });

  it('should add devTools nav link if chrome nav link exists', async () => {
    mockChromeNavLinks.mockReturnValue([devToolsChromeNavLink]);
    const testSecurityNavLinks$ = new BehaviorSubject([link1]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual([link1, expect.objectContaining({ id: ExternalPageName.devTools })]);
  });

  it('should add machineLearning links', async () => {
    mockChromeNavLinksHas.mockReturnValue(true); // all links exist
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2, linkMlLanding]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual(
      expect.arrayContaining([
        link1,
        link2,
        { ...linkMlLanding, categories: mlNavCategories, links: mlNavLinks },
      ])
    );
  });

  it('should add assets links', async () => {
    mockChromeNavLinksHas.mockReturnValue(true); // all links exist
    const linkAssets: NavigationLink<SecurityPageName> = {
      id: SecurityPageName.assets,
      title: 'Assets',
      links: [link2],
    };
    const testSecurityNavLinks$ = new BehaviorSubject([link1, linkAssets]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual(
      expect.arrayContaining([link1, { ...linkAssets, links: [...assetsNavLinks, link2] }])
    );
  });

  it('should add investigations links', async () => {
    mockChromeNavLinksHas.mockReturnValue(true); // all links exist
    const linkInvestigations: NavigationLink<SecurityPageName> = {
      id: SecurityPageName.investigations,
      title: 'Investigations',
      links: [link2],
    };
    const testSecurityNavLinks$ = new BehaviorSubject([link1, linkInvestigations]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual(
      expect.arrayContaining([
        link1,
        { ...linkInvestigations, links: [link2, ...investigationsNavLinks] },
      ])
    );
  });

  it('should add settings links', async () => {
    mockChromeNavLinksHas.mockReturnValue(true); // all links exist
    const testSecurityNavLinks$ = new BehaviorSubject([link1]);

    const value = await createTestProjectNavLinks(testSecurityNavLinks$);
    expect(value).toEqual(
      expect.arrayContaining([
        link1,
        expect.objectContaining({ id: ExternalPageName.management }),
        expect.objectContaining({ id: ExternalPageName.integrationsSecurity }),
      ])
    );
  });
});
