/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { SecurityPageName } from '../../../../../common/constants';
import type { LinkInfo, LinkItem } from '../../../links';
import { useBreadcrumbsNav } from './use_breadcrumbs_nav';
import type { BreadcrumbsNav } from '../../../breadcrumbs';
import * as kibanaLib from '../../../lib/kibana';

vi.mock('../../../lib/kibana');

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useDispatch: () => mockDispatch,
    };
      return { ...mocked, default: mocked };
    });

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;
const link3Id = 'link-3' as SecurityPageName;
const link4Id = 'link-4' as SecurityPageName;
const link5Id = 'link-5' as SecurityPageName;

const link1: LinkItem = { id: link1Id, title: 'link 1', path: '/link1' };
const link2: LinkItem = { id: link2Id, title: 'link 2', path: '/link2' };
const link3: LinkItem = { id: link3Id, title: 'link 3', path: '/link3' };
const link4: LinkItem = { id: link4Id, title: 'link 4', path: '/link4' };
const link5: LinkItem = { id: link5Id, title: 'link 5', path: '/link5' };

const parentsLinks = [link1, link2, link3];
const trailingLinks = [link4, link5];
const allLinks = [...parentsLinks, ...trailingLinks];

const mockSecuritySolutionUrl: GetSecuritySolutionUrl = vi.fn(
  ({ deepLinkId }: { deepLinkId: SecurityPageName }) =>
    allLinks.find((link) => link.id === deepLinkId)?.path ?? deepLinkId
);
vi.mock('../../link_to', () => {
      const mocked = {
      useGetSecuritySolutionUrl: () => mockSecuritySolutionUrl,
    };
      return { ...mocked, default: mocked };
    });

const mockUpdateBreadcrumbsNav = vi.fn((_param: BreadcrumbsNav) => {});
vi.mock('../../../breadcrumbs', () => {
      const mocked = {
      updateBreadcrumbsNav: (param: BreadcrumbsNav) => mockUpdateBreadcrumbsNav(param),
    };
      return { ...mocked, default: mocked };
    });

const mockUseRouteSpy = vi.fn((): [{ pageName: string }] => [{ pageName: link1Id }]);
vi.mock('../../../utils/route/use_route_spy', () => {
      const mocked = {
      useRouteSpy: () => mockUseRouteSpy(),
    };
      return { ...mocked, default: mocked };
    });

const mockGetParentLinks = vi.fn((_id: unknown): LinkInfo[] => parentsLinks);
vi.mock('../../../links/links_hooks', async () => {
      const mocked = {
      ...(await vi.importActual('../../../links/links_hooks')),
      useParentLinks: (id: unknown) => mockGetParentLinks(id),
    };
      return { ...mocked, default: mocked };
    });

const mockGetTrailingBreadcrumbs = vi.fn((): ChromeBreadcrumb[] =>
  trailingLinks.map(({ title: text, path: href }) => ({ text, href }))
);
vi.mock('./trailing_breadcrumbs', () => {
      const mocked = {
      getTrailingBreadcrumbs: () => mockGetTrailingBreadcrumbs(),
    };
      return { ...mocked, default: mocked };
    });

const landingBreadcrumb = {
  href: 'launchpad',
  text: 'Security',
  onClick: expect.any(Function),
};

describe('useBreadcrumbsNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process breadcrumbs with current pageName', () => {
    renderHook(useBreadcrumbsNav);
    expect(mockGetParentLinks).toHaveBeenCalledWith(link1Id);
    expect(mockGetTrailingBreadcrumbs).toHaveBeenCalledWith();
  });

  it('should not process breadcrumbs with empty pageName', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: '' }]);
    renderHook(useBreadcrumbsNav);
    expect(mockGetTrailingBreadcrumbs).not.toHaveBeenCalledWith();
  });

  it('should not process breadcrumbs with cases pageName', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.case }]);
    renderHook(useBreadcrumbsNav);
    expect(mockGetTrailingBreadcrumbs).not.toHaveBeenCalledWith();
  });

  it('should call updateBreadcrumbsNav with all breadcrumbs', () => {
    renderHook(useBreadcrumbsNav);
    expect(mockUpdateBreadcrumbsNav).toHaveBeenCalledWith({
      leading: [
        landingBreadcrumb,
        {
          href: link1.path,
          text: link1.title,
          onClick: expect.any(Function),
        },
        {
          href: link2.path,
          text: link2.title,
          onClick: expect.any(Function),
        },
        {
          href: link3.path,
          text: link3.title,
          onClick: expect.any(Function),
        },
      ],
      trailing: [
        {
          href: link4.path,
          text: link4.title,
          onClick: expect.any(Function),
        },
        {
          href: link5.path,
          text: link5.title,
          onClick: expect.any(Function),
        },
      ],
    });
  });

  it('should create breadcrumbs onClick handler', () => {
    const reportEventMock = vi.fn();

    (kibanaLib.useKibana as Mock).mockImplementation(() => ({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    }));

    renderHook(useBreadcrumbsNav);
    const event = { preventDefault: vi.fn() } as unknown as React.MouseEvent<
      HTMLElement,
      MouseEvent
    >;
    const breadcrumb = mockUpdateBreadcrumbsNav.mock.calls?.[0]?.[0]?.leading[1];
    breadcrumb?.onClick?.(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
    expect(reportEventMock).toHaveBeenCalled();
  });

  it('should use SecurityPageName.launchpad', () => {
    renderHook(useBreadcrumbsNav);

    const calls = (mockSecuritySolutionUrl as Mock).mock.calls;
    const launchpadBreadcrumbCall = calls.find(
      (call) => call[0].deepLinkId === SecurityPageName.launchpad
    );

    expect(launchpadBreadcrumbCall).toBeDefined();
  });
});
