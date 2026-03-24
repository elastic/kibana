/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuccessfulGenerationsQuery, DEFAULT_START, DEFAULT_END } from '.';

import {
  ATTACK_DISCOVERY_EVENT_PROVIDER,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
} from '../../../../../common/constants';

import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';

describe('getSuccessfulGenerationsQuery', () => {
  const defaultProps = {
    authenticatedUser: mockAuthenticatedUser,
    end: DEFAULT_END,
    eventLogIndex: 'mock-index',
    size: 10,
    spaceId: 'default',
    start: DEFAULT_START,
  };

  const getMustClauses = (query: ReturnType<typeof getSuccessfulGenerationsQuery>): unknown[] => {
    if (!query.query || !query.query.bool) return [];
    return Array.isArray(query.query.bool.must) ? query.query.bool.must : [];
  };

  const findTerm = (mustClauses: unknown[], field: string) =>
    mustClauses.find(
      (clause: unknown) =>
        typeof clause === 'object' &&
        clause !== null &&
        'term' in clause &&
        typeof (clause as Record<string, unknown>).term === 'object' &&
        (clause as { term: Record<string, unknown> }).term !== null &&
        field in (clause as { term: Record<string, unknown> }).term
    ) as { term: Record<string, unknown> } | undefined;

  const findRange = (mustClauses: unknown[], field: string) =>
    mustClauses.find(
      (clause: unknown) =>
        typeof clause === 'object' &&
        clause !== null &&
        'range' in clause &&
        typeof (clause as Record<string, unknown>).range === 'object' &&
        (clause as { range: Record<string, unknown> }).range !== null &&
        field in (clause as { range: Record<string, unknown> }).range
    ) as { range: Record<string, unknown> } | undefined;

  it('returns a query with the expected index', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });

    expect(query.index).toEqual(['mock-index']);
  });

  it('returns a query with size zero', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });

    expect(query.size).toEqual(0);
  });

  it('returns a query with the expected aggs size', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });

    expect(query.aggs?.successfull_generations_by_connector_id?.terms?.size).toEqual(10);
  });

  it('returns a query with the expected user.name filter', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });
    const userTerm = findTerm(getMustClauses(query), 'user.name');

    expect(userTerm?.term['user.name']).toEqual(mockAuthenticatedUser.username);
  });

  it('returns a query with the expected spaceId filter', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });
    const spaceTerm = findTerm(getMustClauses(query), 'kibana.space_ids');

    expect(spaceTerm?.term['kibana.space_ids']).toEqual('default');
  });

  it('returns a query with the expected event.provider filter', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });
    const providerTerm = findTerm(getMustClauses(query), 'event.provider');

    expect(providerTerm?.term['event.provider']).toEqual(ATTACK_DISCOVERY_EVENT_PROVIDER);
  });

  it('returns a query with the expected event.action filter', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });
    const actionTerm = findTerm(getMustClauses(query), 'event.action');

    expect(actionTerm?.term['event.action']).toEqual(
      ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED
    );
  });

  it('returns a query with the expected timestamp range', () => {
    const query = getSuccessfulGenerationsQuery({ ...defaultProps });
    const rangeTerm = findRange(getMustClauses(query), '@timestamp');

    expect(rangeTerm?.range['@timestamp']).toEqual({
      gte: DEFAULT_START,
      lte: DEFAULT_END,
      format: 'strict_date_optional_time',
    });
  });
});
