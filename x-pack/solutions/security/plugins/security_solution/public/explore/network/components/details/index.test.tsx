/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import type { ActionCreator } from 'typescript-fsa';

import { TestProviders } from '../../../../common/mock';
import { networkModel } from '../../store';

import { IpOverview } from '.';
import { mockData } from './mock';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import type { NarrowDateRange } from '../../../../common/components/ml/types';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

describe('IP Overview Component', () => {
  describe('rendering', () => {
    const mockProps = {
      anomaliesData: mockAnomalies,
      data: mockData.IpOverview,
      endDate: '2019-06-18T06:00:00.000Z',
      flowTarget: FlowTargetSourceDest.source,
      loading: false,
      id: 'ipOverview',
      ip: '10.10.10.10',
      isInDetailsSidePanel: false,
      isLoadingAnomaliesData: false,
      narrowDateRange: jest.fn() as unknown as NarrowDateRange,
      startDate: '2019-06-15T06:00:00.000Z',
      type: networkModel.NetworkType.details,
      updateFlowTargetAction: jest.fn() as unknown as ActionCreator<{
        flowTarget: FlowTargetSourceDest;
      }>,
      indexPatterns: [],
      jobNameById: {},
      scopeId: SourcererScopeName.default,
    };

    test('it renders the default IP Overview', () => {
      const wrapper = shallow(
        <TestProviders>
          <IpOverview {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('IpOverview')).toMatchSnapshot();
    });

    test('it renders the side panel IP overview', () => {
      const panelViewProps = {
        ...mockProps,
        isInDetailsSidePanel: true,
      };
      const wrapper = shallow(
        <TestProviders>
          <IpOverview {...panelViewProps} />
        </TestProviders>
      );

      expect(wrapper.find('IpOverview')).toMatchSnapshot();
    });
  });
});
