/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { AddExceptionFlyoutProps } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import type { EndpointExceptionsFlyoutProps } from '../../../../management/pages/endpoint_exceptions/view/components/endpoint_exceptions_flyout';
import { AddRuleException } from '.';
import { ADD_RULE_EXCEPTION_LOADING_TEST_ID, ADD_RULE_EXCEPTION_TITLE_TEST_ID } from './test_ids';

const mockUseRuleWithFallback = jest.fn();
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => ({
  useRuleWithFallback: (...args: unknown[]) => mockUseRuleWithFallback(...args),
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (...args: unknown[]) =>
    mockUseIsExperimentalFeatureEnabled(...args),
}));

const mockEndpointExceptionsFlyout = jest.fn<React.ReactElement, [EndpointExceptionsFlyoutProps]>(
  () => <div data-test-subj="endpointExceptionContent" />
);
jest.mock(
  '../../../../management/pages/endpoint_exceptions/view/components/endpoint_exceptions_flyout',
  () => ({
    EndpointExceptionsFlyout: (props: EndpointExceptionsFlyoutProps) =>
      mockEndpointExceptionsFlyout(props),
  })
);

const mockAddExceptionFlyoutContent = jest.fn<React.ReactElement, [AddExceptionFlyoutProps]>(() => (
  <div data-test-subj="addExceptionContent" />
));
jest.mock('../../../../detection_engine/rule_exceptions/components/add_exception_flyout', () => ({
  AddExceptionFlyout: (props: AddExceptionFlyoutProps) => mockAddExceptionFlyoutContent(props),
}));

jest.mock('../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({
    title,
    titleDataTestSubj,
  }: {
    title: React.ReactNode;
    titleDataTestSubj?: string;
  }) => (
    <div data-test-subj="toolsFlyoutHeader">
      <span data-test-subj={titleDataTestSubj}>{title}</span>
    </div>
  ),
}));

const onCancel = jest.fn();
const onConfirm = jest.fn();

const defaultSource = {
  '@timestamp': '2026-05-11T11:54:22.134Z',
  agent: { type: 'endpoint' },
  event: { code: 'behavior', kind: 'signal' },
  file: { hash: { sha256: 'abc123' }, path: 'C:\\Windows\\System32\\example.exe' },
  host: { os: { name: 'Windows' } },
};

// flattened is used by getFieldValue for ruleId / alertStatus extraction only
const defaultFlattenedAlertFields = {
  'kibana.alert.rule.uuid': ['rule-uuid'],
  'kibana.alert.workflow_status': ['open'],
};

const createDiscoverHit = (
  flattened: DataTableRecord['flattened'] = defaultFlattenedAlertFields,
  source: object = defaultSource
): DataTableRecord =>
  ({
    id: 'alert-id',
    raw: {
      _id: 'alert-id',
      _index: '.alerts-security.alerts-default',
      _source: source,
    },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('<AddRuleException />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRuleWithFallback.mockReturnValue({
      loading: false,
      rule: { id: 'rule-id', type: 'query' },
    });
    mockUseIsExperimentalFeatureEnabled.mockImplementation(
      (feature: string) => feature === 'endpointExceptionsMovedUnderManagement'
    );
  });

  it('builds alert data from raw _source without staying in loading state', () => {
    render(
      <AddRuleException
        hit={createDiscoverHit()}
        exceptionListType={ExceptionListTypeEnum.ENDPOINT}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByTestId(ADD_RULE_EXCEPTION_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(ADD_RULE_EXCEPTION_TITLE_TEST_ID)).toHaveTextContent(
      'Add Endpoint Exception'
    );
    expect(screen.getByTestId('endpointExceptionContent')).toBeInTheDocument();
    expect(mockUseRuleWithFallback).toHaveBeenCalledWith('rule-uuid');

    const endpointExceptionsFlyoutProps = mockEndpointExceptionsFlyout.mock.calls[0]?.[0];
    if (!endpointExceptionsFlyoutProps) {
      throw new Error('Expected EndpointExceptionsFlyout to be called');
    }

    const { alertData, alertStatus } = endpointExceptionsFlyoutProps;
    expect(alertStatus).toEqual('open');
    expect(alertData).toEqual(
      expect.objectContaining({
        _id: 'alert-id',
        _index: '.alerts-security.alerts-default',
        agent: expect.objectContaining({ type: 'endpoint' }),
        event: expect.objectContaining({ code: 'behavior', kind: 'signal' }),
        file: expect.objectContaining({
          hash: expect.objectContaining({ sha256: 'abc123' }),
          path: 'C:\\Windows\\System32\\example.exe',
        }),
        host: expect.objectContaining({
          os: expect.objectContaining({ name: 'Windows' }),
        }),
      })
    );
  });

  it('does not request an empty rule id when the alert rule uuid is missing', () => {
    mockUseRuleWithFallback.mockReturnValue({
      loading: false,
      rule: null,
    });

    render(
      <AddRuleException
        hit={createDiscoverHit({ 'event.kind': ['signal'] }, {})}
        exceptionListType={ExceptionListTypeEnum.RULE_DEFAULT}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(mockUseRuleWithFallback).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId(ADD_RULE_EXCEPTION_LOADING_TEST_ID)).toBeInTheDocument();
    expect(mockAddExceptionFlyoutContent).not.toHaveBeenCalled();
  });
});
