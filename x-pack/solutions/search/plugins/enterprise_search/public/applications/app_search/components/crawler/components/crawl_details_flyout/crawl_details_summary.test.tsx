/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { CrawlDetailsSummary } from './crawl_details_summary';

const MOCK_PROPS = {
  crawlDepth: 8,
  crawlerLogsEnabled: true,
  crawlType: 'full',
  domainCount: 15,
  stats: {
    status: {
      urlsAllowed: 108,
      crawlDurationMSec: 748382,
      pagesVisited: 108,
      avgResponseTimeMSec: 42,
      statusCodes: {
        401: 4,
        404: 8,
        500: 0,
        503: 3,
      },
    },
  },
};

describe('CrawlDetailsSummary', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<CrawlDetailsSummary {...MOCK_PROPS} />);
  });

  it('renders as a panel with all fields', () => {
    expect(wrapper.is(EuiPanel)).toBe(true);
  });

  it('renders the proper count for errors', () => {
    const serverErrors = wrapper.find({ 'data-test-subj': 'serverErrors' });
    const clientErrors = wrapper.find({ 'data-test-subj': 'clientErrors' });

    expect(serverErrors.prop('title')).toEqual(3);
    expect(clientErrors.prop('title')).toEqual(12);
  });

  it('handles missing stats gracefully', () => {
    wrapper.setProps({ stats: {} });
    expect(wrapper.find({ 'data-test-subj': 'crawlDuration' }).prop('title')).toEqual('--');
    expect(wrapper.find({ 'data-test-subj': 'pagesVisited' }).prop('title')).toEqual('--');
    expect(wrapper.find({ 'data-test-subj': 'avgResponseTime' }).prop('title')).toEqual('--');
  });

  it('renders the stat object when logs are disabled but stats are not null', () => {
    wrapper.setProps({ crawlerLogsEnabled: false });
    expect(wrapper.find({ 'data-test-subj': 'crawlDuration' })).toHaveLength(1);
    expect(wrapper.find({ 'data-test-subj': 'pagesVisited' })).toHaveLength(1);
    expect(wrapper.find({ 'data-test-subj': 'avgResponseTime' })).toHaveLength(1);
    expect(wrapper.find({ 'data-test-subj': 'urlsAllowed' })).toHaveLength(1);
    expect(wrapper.find({ 'data-test-subj': 'logsDisabledMessage' })).toHaveLength(0);
  });

  it('renders a message to enable logs when crawler logs are disabled and stats are null', () => {
    wrapper.setProps({ crawlerLogsEnabled: false, stats: null });
    expect(wrapper.find({ 'data-test-subj': 'crawlDuration' })).toHaveLength(0);
    expect(wrapper.find({ 'data-test-subj': 'pagesVisited' })).toHaveLength(0);
    expect(wrapper.find({ 'data-test-subj': 'avgResponseTime' })).toHaveLength(0);
    expect(wrapper.find({ 'data-test-subj': 'urlsAllowed' })).toHaveLength(0);
    expect(wrapper.find({ 'data-test-subj': 'logsDisabledMessage' })).toHaveLength(1);
  });
});
