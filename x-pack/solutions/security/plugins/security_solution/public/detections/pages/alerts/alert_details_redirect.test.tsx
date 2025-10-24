/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { AlertDetailsRedirect } from './alert_details_redirect';
import { TestProviders } from '../../../common/mock';
import { ALERT_DETAILS_REDIRECT_PATH, ALERTS_PATH } from '../../../../common/constants';
import { mockHistory } from '../../../common/utils/route/mocks';

jest.mock('../../../common/lib/kibana');

const testAlertId = 'test-alert-id';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    alertId: testAlertId,
  }),
}));

const testIndex = '.someTestIndex';
const testTimestamp = '2023-04-20T12:00:00.000Z';
const mockPathname = `${ALERT_DETAILS_REDIRECT_PATH}/${testAlertId}`;

describe('AlertDetailsRedirect', () => {
  afterEach(() => {
    mockHistory.replace.mockClear();
  });

  describe('with index and timestamp query parameters set', () => {
    it('redirects to the expected path with the correct query parameters', () => {
      const testSearch = `?index=${testIndex}&timestamp=${testTimestamp}`;
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: testSearch,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const expectedSearch = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-alert-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2023-04-20T12:00:00.000Z',kind:absolute,to:'2023-04-20T12:05:00.000Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        pageFilters:
          '!((displaySettings:(hideActionBar:!f),exclude:!f,existsSelected:!f,fieldName:kibana.alert.workflow_status,selectedOptions:!(),title:Status))',
        flyout:
          '(preview:!(),right:(id:document-details-right,params:(id:test-alert-id,indexName:.someTestIndex,scopeId:alerts-page)))',
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?${expectedSearch.toString()}`,
        state: undefined,
      });
    });
  });

  describe('with only index query parameter set', () => {
    it('redirects to the expected path with the default global timestamp settings', () => {
      const testSearch = `?index=${testIndex}`;
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: testSearch,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const expectedSearchParam = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-alert-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',kind:absolute,to:'2020-07-08T08:25:18.966Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        pageFilters:
          '!((displaySettings:(hideActionBar:!f),exclude:!f,existsSelected:!f,fieldName:kibana.alert.workflow_status,selectedOptions:!(),title:Status))',
        flyout:
          '(preview:!(),right:(id:document-details-right,params:(id:test-alert-id,indexName:.someTestIndex,scopeId:alerts-page)))',
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?${expectedSearchParam.toString()}`,
        state: undefined,
      });
    });
  });

  describe('with no query parameters set', () => {
    it('redirects to the expected path with the proper default alerts index and default global timestamp setting', () => {
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: '',
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const expectedSearchParam = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-alert-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',kind:absolute,to:'2020-07-08T08:25:18.966Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        pageFilters:
          '!((displaySettings:(hideActionBar:!f),exclude:!f,existsSelected:!f,fieldName:kibana.alert.workflow_status,selectedOptions:!(),title:Status))',
        flyout:
          '(preview:!(),right:(id:document-details-right,params:(id:test-alert-id,indexName:.internal.alerts-security.alerts-default,scopeId:alerts-page)))',
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?${expectedSearchParam.toString()}`,
        state: undefined,
      });
    });
  });
});
