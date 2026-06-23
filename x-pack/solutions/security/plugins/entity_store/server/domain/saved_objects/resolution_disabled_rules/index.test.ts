/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { ResolutionRulesClient } from '.';
import type { ResolutionDisabledRules } from './constants';
import { EntityStoreResolutionDisabledRulesTypeName } from './types';

const NAMESPACE = 'default';
const SO_ID = `${EntityStoreResolutionDisabledRulesTypeName}-${NAMESPACE}`;

const emptyFindResponse = (): SavedObjectsFindResponse<ResolutionDisabledRules> =>
  ({
    total: 0,
    saved_objects: [],
    page: 1,
    per_page: 1,
  } as SavedObjectsFindResponse<ResolutionDisabledRules>);

const findResponseWith = (
  disabledRuleIds: string[]
): SavedObjectsFindResponse<ResolutionDisabledRules> =>
  ({
    total: 1,
    page: 1,
    per_page: 1,
    saved_objects: [
      {
        id: SO_ID,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds },
        score: 0,
      },
    ],
  } as unknown as SavedObjectsFindResponse<ResolutionDisabledRules>);

describe('ResolutionRulesClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: ResolutionRulesClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    client = new ResolutionRulesClient(soClient, NAMESPACE, logger);
  });

  describe('getDisabledRuleIds', () => {
    it('returns an empty array when no SO exists', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      await expect(client.getDisabledRuleIds()).resolves.toEqual([]);
    });

    it('returns the persisted disabled ids', async () => {
      soClient.find.mockResolvedValue(findResponseWith(['email_exact_match']));
      await expect(client.getDisabledRuleIds()).resolves.toEqual(['email_exact_match']);
    });

    it('queries scoped to the namespace', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      await client.getDisabledRuleIds();
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EntityStoreResolutionDisabledRulesTypeName,
          namespaces: [NAMESPACE],
        })
      );
    });
  });

  describe('enable / disable', () => {
    it('creates the SO and adds the id on first disable', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      soClient.create.mockResolvedValue({
        id: SO_ID,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds: ['email_exact_match'] },
      });

      await client.disable('email_exact_match');

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreResolutionDisabledRulesTypeName,
        { disabledRuleIds: ['email_exact_match'] },
        { id: SO_ID, refresh: 'wait_for' }
      );
    });

    it('appends to the existing disabled list on disable', async () => {
      soClient.find.mockResolvedValue(findResponseWith(['some_other_rule']));
      soClient.update.mockResolvedValue({
        id: SO_ID,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds: ['some_other_rule', 'email_exact_match'] },
      });

      await client.disable('email_exact_match');

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreResolutionDisabledRulesTypeName,
        SO_ID,
        { disabledRuleIds: ['some_other_rule', 'email_exact_match'] },
        { refresh: 'wait_for', mergeAttributes: true }
      );
      // Reads the SO exactly once before writing (no redundant read-back).
      expect(soClient.find).toHaveBeenCalledTimes(1);
    });

    it('removes the id from the list on enable', async () => {
      soClient.find.mockResolvedValue(findResponseWith(['some_other_rule', 'email_exact_match']));
      soClient.update.mockResolvedValue({
        id: SO_ID,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds: ['some_other_rule'] },
      });

      await client.enable('email_exact_match');

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreResolutionDisabledRulesTypeName,
        SO_ID,
        { disabledRuleIds: ['some_other_rule'] },
        { refresh: 'wait_for', mergeAttributes: true }
      );
    });

    it('is a no-op when enabling an already-enabled (absent) rule', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());

      await client.enable('email_exact_match');

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is a no-op when disabling an already-disabled rule', async () => {
      soClient.find.mockResolvedValue(findResponseWith(['email_exact_match']));

      await client.disable('email_exact_match');

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });

  describe('getSavedObjectId', () => {
    it('derives the SO id from the namespace', async () => {
      const other = new ResolutionRulesClient(soClient, 'space-2', logger);
      soClient.find.mockResolvedValue(emptyFindResponse());
      soClient.create.mockResolvedValue({
        id: `${EntityStoreResolutionDisabledRulesTypeName}-space-2`,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds: ['email_exact_match'] },
      });

      await other.disable('email_exact_match');

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ namespaces: ['space-2'] })
      );
      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreResolutionDisabledRulesTypeName,
        { disabledRuleIds: ['email_exact_match'] },
        { id: `${EntityStoreResolutionDisabledRulesTypeName}-space-2`, refresh: 'wait_for' }
      );
    });
  });
});
