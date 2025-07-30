/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { getUpdateAttackDiscoveryAlertsQuery } from '.';
import { mockAuthenticatedUser } from '../../../__mocks__/mock_authenticated_user';

interface ScriptParams {
  authenticatedUser: { profile_uid: string; username: string };
  kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
  visibility?: 'not_shared' | 'shared';
}

describe('getUpdateAttackDiscoveryAlertsQuery', () => {
  const defaultProps = {
    authenticatedUser: mockAuthenticatedUser,
    ids: ['alert-1', 'alert-2'],
    indexPattern: '.adhoc.alerts-security.attack.discovery.alerts-default',
    kibanaAlertWorkflowStatus: 'acknowledged' as const,
    visibility: 'not_shared' as const,
  };

  let result: estypes.UpdateByQueryRequest;

  beforeEach(() => {
    result = getUpdateAttackDiscoveryAlertsQuery(defaultProps);
  });

  it('returns an UpdateByQueryRequest with the correct index', () => {
    expect(result.index).toEqual(['.adhoc.alerts-security.attack.discovery.alerts-default']);
  });

  it('returns the correct ids in the query', () => {
    expect(result.query).toEqual({ ids: { values: ['alert-1', 'alert-2'] } });
  });

  it('sets the correct script param for authenticatedUser.profile_uid', () => {
    expect(
      (result.script as { params: ScriptParams }).params.authenticatedUser.profile_uid
    ).toEqual(mockAuthenticatedUser.profile_uid);
  });

  it('sets the correct script param for authenticatedUser.username', () => {
    expect((result.script as { params: ScriptParams }).params.authenticatedUser.username).toEqual(
      mockAuthenticatedUser.username
    );
  });

  it('sets the correct script param for kibanaAlertWorkflowStatus', () => {
    expect((result.script as { params: ScriptParams }).params.kibanaAlertWorkflowStatus).toEqual(
      'acknowledged'
    );
  });

  it('sets the correct script param for visibility', () => {
    expect((result.script as { params: ScriptParams }).params.visibility).toEqual('not_shared');
  });

  describe('visibility param', () => {
    it.each([
      { visibility: 'shared' as const },
      { visibility: 'not_shared' as const },
      { visibility: undefined },
    ])('sets visibility param to $visibility', ({ visibility }) => {
      const res = getUpdateAttackDiscoveryAlertsQuery({
        ...defaultProps,
        visibility,
      });
      expect((res.script as { params: ScriptParams }).params.visibility).toEqual(visibility);
    });
  });

  describe('kibanaAlertWorkflowStatus param', () => {
    it.each([
      { kibanaAlertWorkflowStatus: 'acknowledged' as const },
      { kibanaAlertWorkflowStatus: 'closed' as const },
      { kibanaAlertWorkflowStatus: 'open' as const },
      { kibanaAlertWorkflowStatus: undefined },
    ])(
      'sets kibanaAlertWorkflowStatus param to $kibanaAlertWorkflowStatus',
      ({ kibanaAlertWorkflowStatus }) => {
        const res = getUpdateAttackDiscoveryAlertsQuery({
          ...defaultProps,
          kibanaAlertWorkflowStatus,
        });
        expect((res.script as { params: ScriptParams }).params.kibanaAlertWorkflowStatus).toEqual(
          kibanaAlertWorkflowStatus
        );
      }
    );
  });
});
