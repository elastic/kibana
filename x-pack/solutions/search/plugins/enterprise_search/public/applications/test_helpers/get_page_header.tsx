/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeaderProps, EuiTab } from '@elastic/eui';

/*
 * Given an AppSearchPageTemplate or WorkplaceSearchPageTemplate, these
 * helpers dive into various parts of the EuiPageHeader to make assertions
 * slightly less of a pain in shallow renders
 */

export const getPageHeader = (wrapper: ShallowWrapper) => {
  const pageHeader = wrapper.prop('pageHeader') as EuiPageHeaderProps;
  return pageHeader || {};
};

export const getPageTitle = (wrapper: ShallowWrapper) => {
  return getPageHeader(wrapper).pageTitle;
};

export const getPageDescription = (wrapper: ShallowWrapper) => {
  return getPageHeader(wrapper).description;
};

export const getPageHeaderActions = (wrapper: ShallowWrapper) => {
  const actions = getPageHeader(wrapper).rightSideItems || [];

  return shallow(
    <div>
      {actions.map((action, i) => (
        <Fragment key={i}>{action}</Fragment>
      ))}
    </div>
  );
};

export const getPageHeaderTabs = (wrapper: ShallowWrapper) => {
  // The tabs prop of EuiPageHeader takes an `Array<EuiTabProps>`
  // instead of an array of EuiTab jsx components
  // These are then rendered inside of EuiPageHeader as EuiTabs
  // See https://elastic.github.io/eui/#/layout/page-header#tabs-in-the-page-header

  const tabs = getPageHeader(wrapper).tabs || [];

  return shallow(
    <div>
      {tabs.map((tabProps, i) => (
        <EuiTab {...tabProps} key={i} />
      ))}
    </div>
  );
};

export const getPageHeaderChildren = (wrapper: ShallowWrapper) => {
  const children = getPageHeader(wrapper).children || null;

  return shallow(<div>{children}</div>);
};
