/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LinkCategoryType, SecurityPageName } from '../constants';
import { mockNavigateTo, mockGetAppUrl } from '../../mocks/navigation';
import type { AccordionLinkCategory, NavigationLink, TitleLinkCategory } from '../types';
import { LandingLinksIconsCategoriesGroups } from './landing_links_icons_categories_groups';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const rulesLink = {
  id: SecurityPageName.rules,
  title: '<rules title>',
  description: '<rules description>',
  landingIcon: 'testIcon1',
};
const exceptionsLink = {
  id: SecurityPageName.exceptions,
  title: '<exceptions title>',
  description: '<exceptions description>',
  landingIcon: 'testIcon2',
};
const hostsLink = {
  id: SecurityPageName.hosts,
  title: '<hosts title>',
  description: '<hosts description>',
  landingIcon: 'testIcon3',
};
const rulesSubCategory: TitleLinkCategory = {
  label: '<sub category rules label>',
  iconType: 'categoryIcon1',
  linkIds: [SecurityPageName.rules, SecurityPageName.exceptions],
};
const hostsSubCategory: TitleLinkCategory = {
  label: '<sub category hosts label>',
  iconType: 'categoryIcon2',
  linkIds: [SecurityPageName.hosts],
};
const category: AccordionLinkCategory = {
  label: '<accordion category label>',
  type: LinkCategoryType.accordion,
  categories: [rulesSubCategory, hostsSubCategory],
};

const categories = [category];
const links: NavigationLink[] = [rulesLink, exceptionsLink, hostsLink];

describe('LandingLinksIconsCategoriesGroups', () => {
  it('should render items', () => {
    const { queryByText } = render(
      <LandingLinksIconsCategoriesGroups {...{ links, categories }} />
    );

    expect(queryByText(category.label)).toBeInTheDocument();
    expect(queryByText(rulesSubCategory.label)).toBeInTheDocument();
    expect(queryByText(rulesLink.title)).toBeInTheDocument();
    expect(queryByText(exceptionsLink.title)).toBeInTheDocument();
    expect(queryByText(hostsSubCategory.label)).toBeInTheDocument();
    expect(queryByText(hostsLink.title)).toBeInTheDocument();
  });

  it('should render categories', () => {
    const { queryByText } = render(
      <LandingLinksIconsCategoriesGroups {...{ links, categories }} />
    );
    expect(queryByText(rulesSubCategory.label)).toBeInTheDocument();
    expect(queryByText(hostsSubCategory.label)).toBeInTheDocument();
  });

  it('should render items in the same order as defined', () => {
    const { queryAllByTestId } = render(
      <LandingLinksIconsCategoriesGroups {...{ links, categories }} />
    );

    const renderedItems = queryAllByTestId('LandingSubItem');

    expect(renderedItems[0]).toHaveTextContent(rulesLink.title);
    expect(renderedItems[1]).toHaveTextContent(exceptionsLink.title);
    expect(renderedItems[2]).toHaveTextContent(hostsLink.title);
  });

  it('should not render category items that are not present in links', () => {
    const testLinks = [links[0], links[1]]; // no hosts
    const { queryByText } = render(
      <LandingLinksIconsCategoriesGroups {...{ links: testLinks, categories }} />
    );

    expect(queryByText(exceptionsLink.title)).toBeInTheDocument();
    expect(queryByText(rulesLink.title)).toBeInTheDocument();
    expect(queryByText(hostsLink.title)).not.toBeInTheDocument();
  });

  it('should not render category if all items filtered', () => {
    const testLinks = [rulesLink, exceptionsLink]; // no hosts
    const { queryByText } = render(
      <LandingLinksIconsCategoriesGroups {...{ links: testLinks, categories }} />
    );

    expect(queryByText(rulesSubCategory.label)).toBeInTheDocument();
    expect(queryByText(rulesLink.title)).toBeInTheDocument();
    expect(queryByText(exceptionsLink.title)).toBeInTheDocument();

    expect(queryByText(hostsSubCategory.label)).not.toBeInTheDocument();
    expect(queryByText(hostsLink.title)).not.toBeInTheDocument();
  });

  it('should navigate link', () => {
    const { getByText } = render(<LandingLinksIconsCategoriesGroups {...{ links, categories }} />);

    getByText(rulesLink.title).click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.rules,
      absolute: false,
      path: '',
    });
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/rules' });
  });

  it('should call onLinkClick', () => {
    const { getByText } = render(
      <LandingLinksIconsCategoriesGroups {...{ links, categories, onLinkClick: mockOnLinkClick }} />
    );
    getByText(rulesLink.title).click();
    expect(mockOnLinkClick).toHaveBeenCalledWith(SecurityPageName.rules);
  });
});
