/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import * as actions from '../actions';
import { coreMock } from '@kbn/core/public/mocks';
import { InvestigateInTimelineAction } from './investigate_in_timeline_action';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

const ecsRowData: Ecs = {
  _id: '1',
  agent: { type: ['blah'] },
  kibana: {
    alert: {
      workflow_status: ['open'],
      rule: {
        parameters: {},
        uuid: ['testId'],
      },
    },
  },
};

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/lib/apm/use_start_transaction');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../actions');

(KibanaServices.get as jest.Mock).mockReturnValue(coreMock.createStart());
const mockSendAlertToTimeline = jest.spyOn(actions, 'sendAlertToTimelineAction');
(useKibana as jest.Mock).mockReturnValue({
  services: {
    data: {
      search: {
        searchStrategyClient: jest.fn(),
      },
      query: jest.fn(),
    },
  },
});
(useAppToasts as jest.Mock).mockReturnValue({
  addError: jest.fn(),
});

const props = {
  ecsRowData,
  onInvestigateInTimelineAlertClick: () => {},
  ariaLabel: 'test',
};

describe('use investigate in timeline hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('it creates a component and click handler', () => {
    const wrapper = render(
      <TestProviders>
        <InvestigateInTimelineAction {...props} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('send-alert-to-timeline-button')).toBeTruthy();
  });
  test('it calls sendAlertToTimelineAction once on click, not on mount', () => {
    const wrapper = render(
      <TestProviders>
        <InvestigateInTimelineAction {...props} />
      </TestProviders>
    );
    expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(0);
    act(() => {
      fireEvent.click(wrapper.getByTestId('send-alert-to-timeline-button'));
    });
    expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(1);
  });
});
