/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { SecurityPageName } from '../../../../../common/constants';
import type { LinkInfo, LinkItem } from '../../../links';
import { useBreadcrumbsNav } from './use_breadcrumbs_nav';
import type { BreadcrumbsNav } from '../../../breadcrumbs';
import * as kibanaLib from '../../../lib/kibana';

jest.mock('../../../lib/kibana');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

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

const ancestorsLinks = [link1, link2, link3];
const trailingLinks = [link4, link5];
const allLinks = [...ancestorsLinks, ...trailingLinks];

const mockSecuritySolutionUrl: GetSecuritySolutionUrl = jest.fn(
  ({ deepLinkId }: { deepLinkId: SecurityPageName }) =>
    allLinks.find((link) => link.id === deepLinkId)?.path ?? deepLinkId
);
jest.mock('../../link_to', () => ({
  useGetSecuritySolutionUrl: () => mockSecuritySolutionUrl,
}));

const mockUpdateBreadcrumbsNav = jest.fn((_param: BreadcrumbsNav) => {});
jest.mock('../../../breadcrumbs', () => ({
  updateBreadcrumbsNav: (param: BreadcrumbsNav) => mockUpdateBreadcrumbsNav(param),
}));

const mockUseRouteSpy = jest.fn((): [{ pageName: string }] => [{ pageName: link1Id }]);
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

const mockGetAncestorLinks = jest.fn((_id: unknown): LinkInfo[] => ancestorsLinks);
jest.mock('../../../links', () => ({
  ...jest.requireActual('../../../links'),
  getAncestorLinksInfo: (id: unknown) => mockGetAncestorLinks(id),
}));

const mockGetTrailingBreadcrumbs = jest.fn((): ChromeBreadcrumb[] =>
  trailingLinks.map(({ title: text, path: href }) => ({ text, href }))
);
jest.mock('./trailing_breadcrumbs', () => ({
  getTrailingBreadcrumbs: () => mockGetTrailingBreadcrumbs(),
}));

const landingBreadcrumb = {
  href: 'get_started',
  text: 'Security',
  onClick: expect.any(Function),
};

describe('useBreadcrumbsNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process breadcrumbs with current pageName', () => {
    renderHook(useBreadcrumbsNav);
    expect(mockGetAncestorLinks).toHaveBeenCalledWith(link1Id);
    expect(mockGetTrailingBreadcrumbs).toHaveBeenCalledWith();
  });

  it('should not process breadcrumbs with empty pageName', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: '' }]);
    renderHook(useBreadcrumbsNav);
    expect(mockGetAncestorLinks).not.toHaveBeenCalled();
    expect(mockGetTrailingBreadcrumbs).not.toHaveBeenCalledWith();
  });

  it('should not process breadcrumbs with cases pageName', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.case }]);
    renderHook(useBreadcrumbsNav);
    expect(mockGetAncestorLinks).not.toHaveBeenCalled();
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
    const reportEventMock = jest.fn();

    (kibanaLib.useKibana as jest.Mock).mockImplementation(() => ({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    }));

    renderHook(useBreadcrumbsNav);
    const event = { preventDefault: jest.fn() } as unknown as React.MouseEvent<
      HTMLElement,
      MouseEvent
    >;
    const breadcrumb = mockUpdateBreadcrumbsNav.mock.calls?.[0]?.[0]?.leading[1];
    breadcrumb?.onClick?.(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
    expect(reportEventMock).toHaveBeenCalled();
  });
});
