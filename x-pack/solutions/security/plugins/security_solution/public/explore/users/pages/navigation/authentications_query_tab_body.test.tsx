/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { AuthenticationsQueryTabBody } from './authentications_query_tab_body';
import { UsersType } from '../../store/model';
import { useAuthentications } from '../../../containers/authentications';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';

jest.mock('../../../containers/authentications');
jest.mock('../../../../common/containers/query_toggle');
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/components/visualization_actions/actions');
jest.mock('../../../../common/components/visualization_actions/lens_embeddable');
jest.mock('../../../../common/components/matrix_histogram', () => ({
  MatrixHistogram: jest.fn(() => null),
}));

describe('Authentications query tab body', () => {
  const mockUseAuthentications = useAuthentications as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: UsersType.page,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseAuthentications.mockReturnValue([
      false,
      {
        authentications: [],
        id: '123',
        inspect: {
          dsl: [],
          response: [],
        },
        isInspected: false,
        totalCount: 0,
        pageInfo: { activePage: 1, fakeTotalCount: 100, showMorePagesIndicator: false },
        loadPage: jest.fn(),
        refetch: jest.fn(),
      },
    ]);
  });
  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <AuthenticationsQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <AuthenticationsQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(true);
  });

  describe('histogram filterQuery', () => {
    const mockMatrixHistogram = MatrixHistogram as unknown as jest.Mock;

    const getHistogramFilterQuery = () =>
      mockMatrixHistogram.mock.calls[0][0].filterQuery as string;

    it('adds user.name exists clause when no filterQuery and no userName', () => {
      render(
        <TestProviders>
          <AuthenticationsQueryTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(JSON.parse(getHistogramFilterQuery())).toEqual({
        exists: { field: 'user.name' },
      });
    });

    it('adds host.name exists clause when no filterQuery and userName is set', () => {
      render(
        <TestProviders>
          <AuthenticationsQueryTabBody {...defaultProps} userName="test-user" />
        </TestProviders>
      );
      expect(JSON.parse(getHistogramFilterQuery())).toEqual({
        exists: { field: 'host.name' },
      });
    });

    it('combines filterQuery with user.name exists clause when no userName', () => {
      const baseQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };
      render(
        <TestProviders>
          <AuthenticationsQueryTabBody {...defaultProps} filterQuery={JSON.stringify(baseQuery)} />
        </TestProviders>
      );
      expect(JSON.parse(getHistogramFilterQuery())).toEqual({
        bool: { filter: [baseQuery, { exists: { field: 'user.name' } }] },
      });
    });

    it('combines filterQuery with host.name exists clause when userName is set', () => {
      const baseQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };
      render(
        <TestProviders>
          <AuthenticationsQueryTabBody
            {...defaultProps}
            filterQuery={JSON.stringify(baseQuery)}
            userName="test-user"
          />
        </TestProviders>
      );
      expect(JSON.parse(getHistogramFilterQuery())).toEqual({
        bool: { filter: [baseQuery, { exists: { field: 'host.name' } }] },
      });
    });

    it('combines a complex filterQuery with user.name exists clause', () => {
      const complexFilterQuery =
        '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"term":{"user.email":"tyshawn.dellaquila@acmecrm.com"}},{"bool":{"should":[{"term":{"event.module":"okta"}},{"prefix":{"data_stream.dataset":"okta"}},{"term":{"event.module":"entityanalytics_okta"}},{"prefix":{"data_stream.dataset":"entityanalytics_okta"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}';
      render(
        <TestProviders>
          <AuthenticationsQueryTabBody {...defaultProps} filterQuery={complexFilterQuery} />
        </TestProviders>
      );
      expect(JSON.parse(getHistogramFilterQuery())).toEqual({
        bool: {
          filter: [JSON.parse(complexFilterQuery), { exists: { field: 'user.name' } }],
        },
      });
    });
  });
});
