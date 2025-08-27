/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
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
      data: mockData.complete,
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
      isFlyoutOpen: false,
    };

    test('it renders the default IP Overview', () => {
      const { container } = render(
        <TestProviders>
          <IpOverview {...mockProps} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });

    test('it renders the side panel IP overview', () => {
      const panelViewProps = {
        ...mockProps,
        isInDetailsSidePanel: true,
      };
      const { container } = render(
        <TestProviders>
          <IpOverview {...panelViewProps} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });
});
