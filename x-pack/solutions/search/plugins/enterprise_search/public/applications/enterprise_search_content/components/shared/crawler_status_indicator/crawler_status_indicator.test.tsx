/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { CrawlerDomain, CrawlerStatus } from '../../../api/crawler/types';

import { CrawlerStatusIndicator } from './crawler_status_indicator';
import { StartCrawlContextMenu } from './start_crawl_context_menu';
import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

const MOCK_VALUES = {
  domains: [{}, {}] as CrawlerDomain[],
  mostRecentCrawlRequestStatus: CrawlerStatus.Success,
};

describe('CrawlerStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no domains', () => {
    it('is disabled', () => {
      setMockValues({
        ...MOCK_VALUES,
        domains: [],
      });

      const wrapper = shallow(<CrawlerStatusIndicator />);
      expect(wrapper.is(EuiButton)).toEqual(true);
      expect(wrapper.prop('disabled')).toEqual(true);
    });
  });

  [CrawlerStatus.Success, CrawlerStatus.Failed, CrawlerStatus.Canceled].forEach((status) => {
    describe(`when the status is ready for retry: ${status}`, () => {
      it('renders an CrawlerStatusIndicator with start crawl button', () => {
        setMockValues({
          ...MOCK_VALUES,
          mostRecentCrawlRequestStatus: status,
        });

        const wrapper = shallow(<CrawlerStatusIndicator />);
        expect(wrapper.is(StartCrawlContextMenu)).toEqual(true);
      });
    });
  });

  [CrawlerStatus.Pending, CrawlerStatus.Suspended].forEach((status) => {
    describe(`when the status is ${status}`, () => {
      it('renders an CrawlerStatusIndicator with a pending indicator', () => {
        setMockValues({
          ...MOCK_VALUES,
          mostRecentCrawlRequestStatus: status,
        });

        const wrapper = shallow(<CrawlerStatusIndicator />);
        expect(wrapper.is(EuiButton)).toEqual(true);
        expect(wrapper.render().text()).toContain('Pending...');
        expect(wrapper.prop('isLoading')).toEqual(true);
      });
    });
  });

  describe('when the status is Starting', () => {
    it('renders an appropriate CrawlerStatusIndicator', () => {
      setMockValues({
        ...MOCK_VALUES,
        mostRecentCrawlRequestStatus: CrawlerStatus.Starting,
      });

      const wrapper = shallow(<CrawlerStatusIndicator />);
      expect(wrapper.is(EuiButton)).toEqual(true);
      expect(wrapper.render().text()).toContain('Starting...');
      expect(wrapper.prop('isLoading')).toEqual(true);
    });
  });

  describe('when the status is Running', () => {
    it('renders a stop crawl popover menu', () => {
      setMockValues({
        ...MOCK_VALUES,
        mostRecentCrawlRequestStatus: CrawlerStatus.Running,
      });

      const wrapper = shallow(<CrawlerStatusIndicator />);
      expect(wrapper.is(StopCrawlPopoverContextMenu)).toEqual(true);
    });
  });

  [CrawlerStatus.Canceling, CrawlerStatus.Suspending].forEach((status) => {
    describe(`when the status is ${status}`, () => {
      it('renders an CrawlerStatusIndicator with a stopping indicator', () => {
        setMockValues({
          ...MOCK_VALUES,
          mostRecentCrawlRequestStatus: status,
        });

        const wrapper = shallow(<CrawlerStatusIndicator />);
        expect(wrapper.is(EuiButton)).toEqual(true);
        expect(wrapper.render().text()).toContain('Stopping...');
        expect(wrapper.prop('isLoading')).toEqual(true);
      });
    });
  });

  describe('when status is not a valid status', () => {
    it('renders an CrawlerStatusIndicator with start crawl button', () => {
      // this tests a codepath that should be impossible to reach, status should always be a CrawlerStatus
      // but we use a switch statement and need to test the default case for this to receive 100% coverage
      setMockValues({
        ...MOCK_VALUES,
        mostRecentCrawlRequestStatus: null,
      });

      const wrapper = shallow(<CrawlerStatusIndicator />);
      expect(wrapper.is(StartCrawlContextMenu)).toEqual(true);
    });
  });
});
