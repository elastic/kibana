/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { RulesNotFoundError, RulesNotVisibleError } from '@kbn/alerting-plugin/server';
import { fetchRulesByQueryOrIds, RuleNotFoundError } from './fetch_rules_by_query_or_ids';

describe('fetchRulesByQueryOrIds', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  const fetchByIds = (ids: string[]) =>
    fetchRulesByQueryOrIds({ query: undefined, ids, rulesClient, maxRules: 100 });

  it('returns a RuleNotFoundError for ids that bulkGetRules reports as 404', async () => {
    rulesClient.bulkGetRules.mockResolvedValue({
      rules: [],
      errors: [{ id: 'missing-id', error: { message: 'Saved object not found', statusCode: 404 } }],
    });

    const { errors } = await fetchByIds(['missing-id']);

    expect(errors).toHaveLength(1);
    expect(errors[0].item).toBe('missing-id');
    expect(errors[0].error).toBeInstanceOf(RuleNotFoundError);
    expect(errors[0].error).toMatchObject({ message: 'Rule not found' });
  });

  it('returns a plain error for ids that bulkGetRules fails to resolve with a non-404 error', async () => {
    rulesClient.bulkGetRules.mockResolvedValue({
      rules: [],
      errors: [{ id: 'broken-id', error: { message: 'Internal error', statusCode: 500 } }],
    });

    const { errors } = await fetchByIds(['broken-id']);

    expect(errors[0].error).not.toBeInstanceOf(RuleNotFoundError);
    expect(errors[0].error).toEqual(new Error('Error resolving the rule'));
  });

  it('returns a RuleNotFoundError for every id when bulkGetRules throws RulesNotFoundError', async () => {
    rulesClient.bulkGetRules.mockRejectedValue(new RulesNotFoundError('get'));

    const { errors } = await fetchByIds(['id-1', 'id-2']);

    expect(errors.map(({ item }) => item)).toEqual(['id-1', 'id-2']);
    errors.forEach(({ error }) => expect(error).toBeInstanceOf(RuleNotFoundError));
  });

  it('returns a RuleNotFoundError for every id when bulkGetRules throws RulesNotVisibleError', async () => {
    rulesClient.bulkGetRules.mockRejectedValue(new RulesNotVisibleError('get'));

    const { errors } = await fetchByIds(['id-1', 'id-2']);

    expect(errors.map(({ item }) => item)).toEqual(['id-1', 'id-2']);
    errors.forEach(({ error }) => expect(error).toBeInstanceOf(RuleNotFoundError));
  });

  it('returns a plain error for every id when bulkGetRules throws another error', async () => {
    rulesClient.bulkGetRules.mockRejectedValue(Boom.forbidden('Unauthorized'));

    const { errors } = await fetchByIds(['id-1']);

    expect(errors[0].error).not.toBeInstanceOf(RuleNotFoundError);
    expect(errors[0].error).toEqual(new Error('Unauthorized'));
  });
});
