/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { LogRetention } from '../../log_retention/types';

import { LogRetentionPanel } from './log_retention_panel';

describe('<LogRetentionPanel />', () => {
  const actions = {
    fetchLogRetention: jest.fn(),
    toggleLogRetention: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(logRetentionPanel.find('[data-test-subj="LogRetentionPanel"]')).toHaveLength(1);
  });

  it('initializes data on mount', () => {
    shallow(<LogRetentionPanel />);
    expect(actions.fetchLogRetention).toHaveBeenCalledTimes(1);
  });

  it('renders Analytics switch off when analytics log retention is false in LogRetentionLogic ', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        analytics: {
          enabled: false,
        },
      }),
    });

    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAnalyticsSwitch"]').prop('checked')
    ).toEqual(false);
  });

  it('renders Analytics switch on when analyticsLogRetention is true in LogRetentionLogic ', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        analytics: {
          enabled: true,
        },
      }),
    });

    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAnalyticsSwitch"]').prop('checked')
    ).toEqual(true);
  });

  it('renders API switch off when apiLogRetention is false in LogRetentionLogic ', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        api: {
          enabled: false,
        },
      }),
    });

    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAPISwitch"]').prop('checked')
    ).toEqual(false);
  });

  it('renders API switch on when apiLogRetention is true in LogRetentionLogic ', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        api: {
          enabled: true,
        },
      }),
    });

    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAPISwitch"]').prop('checked')
    ).toEqual(true);
  });

  it('enables all switches when isLogRetentionUpdating is false', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({}),
    });
    const logRetentionPanel = shallow(<LogRetentionPanel />);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAnalyticsSwitch"]').prop('disabled')
    ).toEqual(false);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAPISwitch"]').prop('disabled')
    ).toEqual(false);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelCrawlerSwitch"]').prop('disabled')
    ).toEqual(false);
  });

  it('disables all switches when isLogRetentionUpdating is true', () => {
    setMockValues({
      isLogRetentionUpdating: true,
      logRetention: mockLogRetention({}),
    });
    const logRetentionPanel = shallow(<LogRetentionPanel />);

    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAnalyticsSwitch"]').prop('disabled')
    ).toEqual(true);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelAPISwitch"]').prop('disabled')
    ).toEqual(true);
    expect(
      logRetentionPanel.find('[data-test-subj="LogRetentionPanelCrawlerSwitch"]').prop('disabled')
    ).toEqual(true);
  });

  it('calls toggleLogRetention when analytics log retention option is changed', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        analytics: {
          enabled: false,
        },
      }),
    });
    const logRetentionPanel = shallow(<LogRetentionPanel />);
    logRetentionPanel
      .find('[data-test-subj="LogRetentionPanelAnalyticsSwitch"]')
      .simulate('change');
    expect(actions.toggleLogRetention).toHaveBeenCalledWith('analytics');
  });

  it('calls toggleLogRetention when api log retention option is changed', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        api: {
          enabled: false,
        },
      }),
    });
    const logRetentionPanel = shallow(<LogRetentionPanel />);
    logRetentionPanel.find('[data-test-subj="LogRetentionPanelAPISwitch"]').simulate('change');
    expect(actions.toggleLogRetention).toHaveBeenCalledWith('api');
  });

  it('calls toggleLogRetention when crawler log retention option is changed', () => {
    setMockValues({
      isLogRetentionUpdating: false,
      logRetention: mockLogRetention({
        crawler: {
          enabled: false,
        },
      }),
    });
    const logRetentionPanel = shallow(<LogRetentionPanel />);
    logRetentionPanel.find('[data-test-subj="LogRetentionPanelCrawlerSwitch"]').simulate('change');
    expect(actions.toggleLogRetention).toHaveBeenCalledWith('crawler');
  });
});

const mockLogRetention = (logRetention: Partial<LogRetention>) => {
  const baseLogRetention = {
    analytics: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
    api: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
    crawler: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
  };

  return {
    analytics: {
      ...baseLogRetention.analytics,
      ...logRetention.analytics,
    },
    api: {
      ...baseLogRetention.api,
      ...logRetention.api,
    },
    crawler: {
      ...baseLogRetention.crawler,
      ...logRetention.crawler,
    },
  };
};
