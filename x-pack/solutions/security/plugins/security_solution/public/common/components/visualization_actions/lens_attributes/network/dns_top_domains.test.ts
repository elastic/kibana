/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';
import type { LensAttributes } from '../../types';

import { useLensAttributes } from '../../use_lens_attributes';

import { getDnsTopDomainsLensAttributes } from './dns_top_domains';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: '192.168.1.1',
      pageName: 'network',
      tabName: 'events',
    },
  ]),
}));

describe('getDnsTopDomainsLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-mytest-*'], 'security-solution-my-test'));
  });

  let result: RenderHookResult<LensAttributes | null, unknown>['result'];
  const render = () => {
    const hookRenderResponse = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getDnsTopDomainsLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );
    return hookRenderResponse.result;
  };
  beforeAll(() => {
    result = render();
  });
  it('should render', () => {
    expect(result?.current).toMatchSnapshot();
  });
  it('should EXCLUDE PTR record by default', () => {
    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        meta: {
          alias: null,
          disabled: false,
          indexRefName: 'filter-index-pattern-0',
          key: 'dns.question.type',
          negate: true,
          params: {
            query: 'PTR',
          },
          type: 'phrase',
        },
        query: {
          match_phrase: {
            'dns.question.type': 'PTR',
          },
        },
      })
    );
  });
  it('should add network details filter if detail name is available', () => {
    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'source.ip': '192.168.1.1',
                },
              },
              {
                match_phrase: {
                  'destination.ip': '192.168.1.1',
                },
              },
            ],
          },
        },
      })
    );
  });
  it('should add tab filter if it is on event tab', () => {
    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
          },
        },
      })
    );
  });
  it('should add index filter', () => {
    expect(result?.current?.state.filters[3]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );
  });
  it('should add filters from global search bar', () => {
    expect(result?.current?.state.filters[4]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should add query from global search bar', () => {
    expect(result?.current?.state.query).toMatchInlineSnapshot(`
      Object {
        "language": "kql",
        "query": "host.name: *",
      }
    `);
  });

  it('should render values in legend', () => {
    expect(result?.current?.state?.visualization).toEqual(
      expect.objectContaining({
        legend: expect.objectContaining({ legendStats: ['currentAndLastValue'] }),
      })
    );
  });
});
