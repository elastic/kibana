/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useNavigateVulnerabilities, useNavigateFindings } from './use_navigate_findings';
import { useHistory } from 'react-router-dom';

vi.mock('react-router-dom', () => {
  const mocked = {
    useHistory: vi.fn().mockReturnValue({ push: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn().mockReturnValue({
      services: {
        data: {
          query: {
            queryString: {
              getDefaultQuery: vi.fn().mockReturnValue({
                language: 'kuery',
                query: '',
              }),
            },
          },
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_data_view', () => {
  const mocked = {
    useDataView: vi.fn().mockReturnValue({
      status: 'success',
      data: {
        id: 'data-view-id',
      },
    }),
  };
  return { ...mocked, default: mocked };
});

describe('useNavigateFindings', () => {
  it('creates a URL to findings page with correct path, filter and dataViewId', () => {
    const push = vi.fn();
    (useHistory as Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateFindings());

    act(() => {
      result.current({ foo: 1 });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/configurations',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:data-view-id,key:foo,negate:!f,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('creates a URL to findings page with correct path and negated filter', () => {
    const push = vi.fn();
    (useHistory as Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateFindings());

    act(() => {
      result.current({ foo: { value: 1, negate: true } });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/configurations',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:data-view-id,key:foo,negate:!t,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('creates a URL to vulnerabilities page with correct path, filter and dataViewId', () => {
    const push = vi.fn();
    (useHistory as Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateVulnerabilities());

    act(() => {
      result.current({ foo: 1 });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/vulnerabilities',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:foo,negate:!f,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
});
