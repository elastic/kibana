/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { deleteLegacyRules } from './delete_legacy_rules';

describe('deleteLegacyRules', () => {
  it('deletes every linked v1 rule by id', async () => {
    const rulesClient = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as RulesClient;

    await deleteLegacyRules(rulesClient, ['rule-a', 'rule-b']);

    expect(rulesClient.delete).toHaveBeenNthCalledWith(1, { id: 'rule-a' });
    expect(rulesClient.delete).toHaveBeenNthCalledWith(2, { id: 'rule-b' });
  });

  it('ignores missing rules because linked ids may belong to Alerting v2', async () => {
    const rulesClient = {
      delete: jest.fn().mockRejectedValueOnce(Boom.notFound()).mockResolvedValueOnce(undefined),
    } as unknown as RulesClient;

    await expect(deleteLegacyRules(rulesClient, ['v2-rule', 'v1-rule'])).resolves.toBeUndefined();
    expect(rulesClient.delete).toHaveBeenCalledTimes(2);
  });

  it('attempts every rule and reports non-404 failures together', async () => {
    const error = Boom.forbidden('missing privileges');
    const rulesClient = {
      delete: jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined),
    } as unknown as RulesClient;

    await expect(deleteLegacyRules(rulesClient, ['rule-a', 'rule-b'])).rejects.toMatchObject({
      message: 'Failed to delete 1 legacy rule(s): rule-a: missing privileges',
      errors: [error],
    });
    expect(rulesClient.delete).toHaveBeenNthCalledWith(2, { id: 'rule-b' });
  });
});
