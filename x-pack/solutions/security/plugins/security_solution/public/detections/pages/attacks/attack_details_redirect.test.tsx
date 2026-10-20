/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { AttackDetailsRedirect } from './attack_details_redirect';
import { TestProviders } from '../../../common/mock';
import {
  ATTACK_DETAILS_REDIRECT_PATH,
  ATTACKS_PATH,
  DEFAULT_ALERTS_INDEX,
} from '../../../../common/constants';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { mockHistory } from '../../../common/utils/route/mocks';
import { encodeFlyoutV2UrlParam } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { resolveAttackFlyoutParams } from './utils';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_is_new_flyout_enabled');

const testAttackId = 'test-attack-id';
const mockRouteParams: { attackId?: string } = { attackId: testAttackId };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockRouteParams,
}));

const testIndex = '.someTestIndex';
const testTimestamp = '2023-04-20T12:00:00.000Z';
const mockPathname = `${ATTACK_DETAILS_REDIRECT_PATH}/${testAttackId}`;

const mockUseIsNewFlyoutEnabled = useIsNewFlyoutEnabled as jest.Mock;

describe('AttackDetailsRedirect', () => {
  beforeEach(() => {
    mockRouteParams.attackId = testAttackId;
    mockUseIsNewFlyoutEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    mockHistory.replace.mockClear();
  });

  describe('with index and timestamp query parameters set', () => {
    it('redirects to the attacks path with query, timerange, and flyout', () => {
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
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const expectedSearch = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-attack-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2023-04-20T12:00:00.000Z',kind:absolute,to:'2023-04-20T12:05:00.000Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        [URL_PARAM_KEY.flyout]: resolveAttackFlyoutParams(
          { index: testIndex, attackId: testAttackId },
          null
        ),
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ATTACKS_PATH,
        search: `?${expectedSearch.toString()}`,
        state: undefined,
      });
    });
  });

  describe('with no query parameters set', () => {
    it('redirects with default alerts index pattern', () => {
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
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const defaultIndex = `.internal${DEFAULT_ALERTS_INDEX}-default`;
      const expectedSearchParam = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-attack-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',kind:absolute,to:'2020-07-08T08:25:18.966Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        [URL_PARAM_KEY.flyout]: resolveAttackFlyoutParams(
          { index: defaultIndex, attackId: testAttackId },
          null
        ),
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ATTACKS_PATH,
        search: `?${expectedSearchParam.toString()}`,
        state: undefined,
      });
    });
  });

  describe('when attackId is missing', () => {
    it('redirects to the attacks list', () => {
      delete mockRouteParams.attackId;

      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: ATTACK_DETAILS_REDIRECT_PATH,
          search: '',
          state: '',
        },
      };

      render(
        <TestProviders>
          <Router history={historyMock}>
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ATTACKS_PATH,
        search: '',
        state: undefined,
      });
    });
  });

  describe('with new flyout enabled', () => {
    beforeEach(() => {
      mockUseIsNewFlyoutEnabled.mockReturnValue(true);
    });

    it('emits flyoutV2 param (not legacy flyout) with an attack descriptor', () => {
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
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const expectedFlyoutV2 = encodeFlyoutV2UrlParam([
        { kind: 'attack', attackId: testAttackId, indexName: testIndex },
      ]);
      const expectedSearch = new URLSearchParams({
        query: "(language:kuery,query:'_id: test-attack-id')",
        timerange:
          "(global:(linkTo:!(timeline),timerange:(from:'2023-04-20T12:00:00.000Z',kind:absolute,to:'2023-04-20T12:05:00.000Z')),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now/d,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now/d)))",
        flyoutV2: expectedFlyoutV2,
      });

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ATTACKS_PATH,
        search: `?${expectedSearch.toString()}`,
        state: undefined,
      });
    });

    it('does not emit legacy flyout param', () => {
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: `?index=${testIndex}&timestamp=${testTimestamp}`,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const [[callArg]] = (historyMock.replace as jest.Mock).mock.calls;
      expect(callArg.search).not.toContain('flyout=');
      expect(callArg.search).toContain('flyoutV2=');
    });

    it('preserves existing flyoutV2 param from the URL', () => {
      const existingFlyoutV2 = encodeFlyoutV2UrlParam([
        { kind: 'attack', attackId: 'existing-id', indexName: '.existing-index' },
      ]);
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: `?index=${testIndex}&timestamp=${testTimestamp}&flyoutV2=${encodeURIComponent(
            existingFlyoutV2
          )}`,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AttackDetailsRedirect />
          </Router>
        </TestProviders>
      );

      const [[callArg]] = (historyMock.replace as jest.Mock).mock.calls;
      const search = new URLSearchParams(callArg.search);
      expect(search.get('flyoutV2')).toBe(existingFlyoutV2);
    });
  });
});
