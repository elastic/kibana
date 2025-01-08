/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/i18n/strings_should_be_translated_with_i18n, @kbn/i18n/strings_should_be_translated_with_formatted_message */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';
import { of } from 'rxjs';

const mockUseEnterpriseSearchAnalyticsNav = jest.fn().mockReturnValue([]);

jest.mock('../../../shared/layout/nav', () => ({
  useEnterpriseSearchAnalyticsNav: (...args: any[]) => mockUseEnterpriseSearchAnalyticsNav(...args),
}));

import { SetAnalyticsChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { EnterpriseSearchAnalyticsPageTemplate } from './page_template';

const mockValues = {
  getChromeStyle$: () => of('classic'),
  updateSideNavDefinition: jest.fn(),
};

describe('EnterpriseSearchAnalyticsPageTemplate', () => {
  it('renders', () => {
    setMockValues(mockValues);

    const wrapper = shallow(
      <EnterpriseSearchAnalyticsPageTemplate>
        <div className="hello">world</div>
      </EnterpriseSearchAnalyticsPageTemplate>
    );

    expect(wrapper.type()).toEqual(EnterpriseSearchPageTemplateWrapper);
    expect(wrapper.prop('solutionNav')).toEqual({ name: 'Elasticsearch', items: [] });
    expect(wrapper.find('.hello').text()).toEqual('world');
  });

  it('updates the side nav dynamic links', async () => {
    const updateSideNavDefinition = jest.fn();
    setMockValues({ ...mockValues, updateSideNavDefinition });

    const collectionsItems = [{ foo: 'bar' }];
    mockUseEnterpriseSearchAnalyticsNav.mockReturnValueOnce([
      {
        id: 'build',
        items: [
          {
            id: 'analyticsCollections',
            items: collectionsItems,
          },
        ],
      },
    ]);

    shallow(<EnterpriseSearchAnalyticsPageTemplate />);

    expect(updateSideNavDefinition).toHaveBeenCalledWith({
      collections: collectionsItems,
    });
  });

  describe('page chrome', () => {
    it('takes a breadcrumb array & renders a product-specific page chrome', () => {
      setMockValues(mockValues);

      const wrapper = shallow(<EnterpriseSearchAnalyticsPageTemplate pageChrome={['Some page']} />);
      const setPageChrome = wrapper
        .find(EnterpriseSearchPageTemplateWrapper)
        .prop('setPageChrome') as any;

      expect(setPageChrome.type).toEqual(SetAnalyticsChrome);
      expect(setPageChrome.props.trail).toEqual(['Some page']);
    });
  });

  describe('page telemetry', () => {
    it('takes a metric & renders product-specific telemetry viewed event', () => {
      setMockValues(mockValues);

      const wrapper = shallow(
        <EnterpriseSearchAnalyticsPageTemplate pageViewTelemetry="some_page" />
      );

      expect(wrapper.find(SendEnterpriseSearchTelemetry).prop('action')).toEqual('viewed');
      expect(wrapper.find(SendEnterpriseSearchTelemetry).prop('metric')).toEqual('some_page');
    });
  });

  describe('props', () => {
    it('passes down any ...pageTemplateProps that EnterpriseSearchPageTemplateWrapper accepts', () => {
      setMockValues(mockValues);

      const wrapper = shallow(
        <EnterpriseSearchAnalyticsPageTemplate
          pageHeader={{ pageTitle: 'hello world' }}
          isLoading={false}
          emptyState={<div />}
        />
      );

      expect(
        wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('pageHeader')!.pageTitle
      ).toEqual('hello world');
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('isLoading')).toEqual(false);
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('emptyState')).toEqual(<div />);
    });

    it('passes down analytics name and paths to useEnterpriseSearchAnalyticsNav', () => {
      setMockValues(mockValues);

      const mockAnalyticsName = 'some_analytics_name';
      shallow(
        <EnterpriseSearchAnalyticsPageTemplate
          analyticsName={mockAnalyticsName}
          pageHeader={{ pageTitle: 'hello world' }}
          isLoading={false}
          emptyState={<div />}
        />
      );

      expect(mockUseEnterpriseSearchAnalyticsNav).toHaveBeenCalledWith(
        mockAnalyticsName,
        {
          explorer: '/collections/some_analytics_name/explorer',
          integration: '/collections/some_analytics_name/integrate',
          overview: '/collections/some_analytics_name/overview',
        },
        true
      );
    });
  });
});
