/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import { fetchDetectionRule } from '../../../../helpers/fetch_detection_rule';
import { findQueryChangeRefusal } from '.';

jest.mock('../../../../helpers/fetch_detection_rule');

const fetchDetectionRuleMock = fetchDetectionRule as jest.Mock;

const http = {} as HttpServiceStart;
const request = httpServerMock.createKibanaRequest() as KibanaRequest;

const defaultParams = {
  changedFields: ['query'],
  http,
  id: 'rule-1',
  request,
  spaceId: 'agent-1',
};

describe('findQueryChangeRefusal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchDetectionRuleMock.mockResolvedValue({
      rule: { id: 'rule-1', type: 'query' },
      status: 200,
    });
  });

  it('allows a query change on a query rule', async () => {
    expect(await findQueryChangeRefusal(defaultParams)).toBeUndefined();
  });

  it('reads the rule as the calling user, in the request-resolved space', async () => {
    await findQueryChangeRefusal(defaultParams);

    expect(fetchDetectionRuleMock).toHaveBeenCalledWith({
      http,
      id: 'rule-1',
      request,
      spaceId: 'agent-1',
    });
  });

  describe('when the change does not touch query', () => {
    it('allows the change', async () => {
      expect(
        await findQueryChangeRefusal({
          ...defaultParams,
          changedFields: ['enabled', 'investigation_fields', 'note'],
        })
      ).toBeUndefined();
    });

    // The common tuning must not pay for a rules read it has no use for.
    it('does not read the rule at all', async () => {
      await findQueryChangeRefusal({ ...defaultParams, changedFields: ['note'] });

      expect(fetchDetectionRuleMock).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['eql', 'eql'],
    ['machine_learning', 'machine_learning'],
    ['threshold', 'threshold'],
    ['esql', 'esql'],
    ['new_terms', 'new_terms'],
  ])('when the rule is a %s rule', (_label, type) => {
    beforeEach(() => {
      fetchDetectionRuleMock.mockResolvedValue({ rule: { id: 'rule-1', type }, status: 200 });
    });

    it('refuses the change naming the field', async () => {
      expect(await findQueryChangeRefusal(defaultParams)).toContain('may not change query');
    });

    it('names the rule type it refused', async () => {
      expect(await findQueryChangeRefusal(defaultParams)).toContain(`of type "${type}"`);
    });
  });

  describe('when the rule carries no readable type', () => {
    beforeEach(() => {
      fetchDetectionRuleMock.mockResolvedValue({ rule: { id: 'rule-1' }, status: 200 });
    });

    it('refuses the change', async () => {
      expect(await findQueryChangeRefusal(defaultParams)).toContain('may not change query');
    });

    // Rendering the literal `undefined` into a message an analyst reads is how "unknown" becomes
    // indistinguishable from a rule type actually called undefined.
    it('describes the type as unknown rather than rendering "undefined"', async () => {
      expect(await findQueryChangeRefusal(defaultParams)).toContain('of type "unknown"');
    });
  });

  describe('when the rule cannot be read', () => {
    it.each([403, 404, 500])('refuses the change on a %s', async (status) => {
      fetchDetectionRuleMock.mockResolvedValue({ rule: undefined, status });

      expect(await findQueryChangeRefusal(defaultParams)).toContain('could not be read');
    });

    // Whether the rule exists is exactly what the candidate-rules route declines to disclose, so a
    // refusal that varied by status would restore that oracle.
    it('gives the same refusal for a 403 as for a 404', async () => {
      fetchDetectionRuleMock.mockResolvedValue({ rule: undefined, status: 403 });
      const forbidden = await findQueryChangeRefusal(defaultParams);

      fetchDetectionRuleMock.mockResolvedValue({ rule: undefined, status: 404 });
      const notFound = await findQueryChangeRefusal(defaultParams);

      expect(forbidden).toBe(notFound);
    });
  });

  describe('when the body identifies the rule only by rule_id', () => {
    it('refuses the change rather than applying an unconfirmed type', async () => {
      expect(await findQueryChangeRefusal({ ...defaultParams, id: undefined })).toContain(
        'may not change query'
      );
    });

    it('says which identifier the confirmation needs', async () => {
      expect(await findQueryChangeRefusal({ ...defaultParams, id: undefined })).toContain(
        'identify the rule by "id"'
      );
    });

    it('does not attempt the read', async () => {
      await findQueryChangeRefusal({ ...defaultParams, id: undefined });

      expect(fetchDetectionRuleMock).not.toHaveBeenCalled();
    });
  });
});
