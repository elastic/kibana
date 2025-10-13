/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type {
  UseAlertPrevalenceFromProcessTreeParams,
  UserAlertPrevalenceFromProcessTreeResult,
} from './use_alert_prevalence_from_process_tree';
import { useAlertPrevalenceFromProcessTree } from './use_alert_prevalence_from_process_tree';
import { useHttp } from '../../../../common/lib/kibana';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useQuery } from '@kbn/react-query';
import { useAlertDocumentAnalyzerSchema } from './use_alert_document_analyzer_schema';
import { mockStatsNode } from '../../right/mocks/mock_analyzer_data';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../timelines/containers/use_timeline_data_filters');
jest.mock('./use_alert_document_analyzer_schema');
jest.mock('@kbn/react-query');
jest.mock('../../../../data_view_manager/hooks/use_security_default_patterns');
jest.mock('../../../../common/hooks/use_experimental_features');

jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useSelector: jest.fn().mockReturnValue({ patternList: ['index'] }),
  };
});

describe('useAlertPrevalenceFromProcessTree', () => {
  let hookResult: RenderHookResult<
    UserAlertPrevalenceFromProcessTreeResult,
    UseAlertPrevalenceFromProcessTreeParams
  >;

  beforeEach(() => {
    (useHttp as jest.Mock).mockReturnValue({
      post: jest.fn(),
    });
    (useSecurityDefaultPatterns as jest.Mock).mockReturnValue({
      indexPatterns: ['index'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all properties when query is loading', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      data: {},
    });
    (useAlertDocumentAnalyzerSchema as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      id: null,
      schema: null,
      agentId: null,
    });

    hookResult = renderHook(() =>
      useAlertPrevalenceFromProcessTree({
        documentId: 'documentId',
        isActiveTimeline: true,
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual(undefined);
    expect(hookResult.result.current.statsNodes).toEqual(undefined);
  });

  it('should return all properties when analyzer query is loading', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {},
    });
    (useAlertDocumentAnalyzerSchema as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      id: null,
      schema: null,
      agentId: null,
    });

    hookResult = renderHook(() =>
      useAlertPrevalenceFromProcessTree({
        documentId: 'documentId',
        isActiveTimeline: true,
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual(undefined);
    expect(hookResult.result.current.statsNodes).toEqual(undefined);
  });

  it('should return all properties data exists', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        alertIds: ['alertIds'],
        statsNodes: [mockStatsNode],
      },
    });
    (useAlertDocumentAnalyzerSchema as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      id: null,
      schema: null,
      agentId: null,
    });

    hookResult = renderHook(() =>
      useAlertPrevalenceFromProcessTree({
        documentId: 'documentId',
        isActiveTimeline: true,
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual(['alertIds']);
    expect(hookResult.result.current.statsNodes).toEqual([mockStatsNode]);
  });

  it('should return all properties data undefined', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
    });
    (useAlertDocumentAnalyzerSchema as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      id: null,
      schema: null,
      agentId: null,
    });

    hookResult = renderHook(() =>
      useAlertPrevalenceFromProcessTree({
        documentId: 'documentId',
        isActiveTimeline: true,
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.alertIds).toEqual(undefined);
    expect(hookResult.result.current.statsNodes).toEqual(undefined);
  });
});
