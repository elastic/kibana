/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { ResolutionRuleOverridesClient } from '.';
import type { ResolutionRuleOverrides } from './constants';
import { EntityStoreResolutionRuleOverridesTypeName } from './types';

const NAMESPACE = 'default';

const emptyFindResponse = (): SavedObjectsFindResponse<ResolutionRuleOverrides> =>
  ({
    total: 0,
    saved_objects: [],
    page: 1,
    per_page: 1,
  } as SavedObjectsFindResponse<ResolutionRuleOverrides>);

const findResponseWith = (
  overrides: ResolutionRuleOverrides['overrides']
): SavedObjectsFindResponse<ResolutionRuleOverrides> =>
  ({
    total: 1,
    page: 1,
    per_page: 1,
    saved_objects: [
      {
        id: `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        type: EntityStoreResolutionRuleOverridesTypeName,
        references: [],
        attributes: { overrides },
        score: 0,
      },
    ],
  } as unknown as SavedObjectsFindResponse<ResolutionRuleOverrides>);

describe('ResolutionRuleOverridesClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: ResolutionRuleOverridesClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    client = new ResolutionRuleOverridesClient(soClient, NAMESPACE, logger);
  });

  describe('find', () => {
    it('returns undefined when no SO exists', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      await expect(client.find()).resolves.toBeUndefined();
    });

    it('parses and returns persisted overrides', async () => {
      soClient.find.mockResolvedValue(findResponseWith({ email_exact_match: { enabled: false } }));
      await expect(client.find()).resolves.toEqual({
        overrides: { email_exact_match: { enabled: false } },
      });
    });

    it('queries scoped to the namespace', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      await client.find();
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EntityStoreResolutionRuleOverridesTypeName,
          namespaces: [NAMESPACE],
        })
      );
    });
  });

  describe('setEnabled', () => {
    it('creates the SO on first disable', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());
      soClient.create.mockResolvedValue({
        id: `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        type: EntityStoreResolutionRuleOverridesTypeName,
        references: [],
        attributes: { overrides: { email_exact_match: { enabled: false } } },
      });

      const result = await client.setEnabled('email_exact_match', false);

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreResolutionRuleOverridesTypeName,
        { overrides: { email_exact_match: { enabled: false } } },
        { id: `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`, refresh: 'wait_for' }
      );
      expect(result.overrides.email_exact_match.enabled).toBe(false);
    });

    it('updates an existing SO and merges with prior overrides', async () => {
      soClient.find.mockResolvedValue(findResponseWith({ some_other_rule: { enabled: false } }));
      soClient.update.mockResolvedValue({
        id: `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        type: EntityStoreResolutionRuleOverridesTypeName,
        references: [],
        attributes: {
          overrides: { some_other_rule: { enabled: false }, email_exact_match: { enabled: false } },
        },
      });

      await client.setEnabled('email_exact_match', false);

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreResolutionRuleOverridesTypeName,
        `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        {
          overrides: { some_other_rule: { enabled: false }, email_exact_match: { enabled: false } },
        },
        { refresh: 'wait_for', mergeAttributes: true }
      );
      // Reads the SO exactly once before writing (no redundant read-back).
      expect(soClient.find).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when enabling an already-enabled (absent) rule', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse());

      await client.setEnabled('email_exact_match', true);

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is a no-op when disabling an already-disabled rule', async () => {
      soClient.find.mockResolvedValue(findResponseWith({ email_exact_match: { enabled: false } }));

      await client.setEnabled('email_exact_match', false);

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('re-enables a disabled rule by writing enabled: true', async () => {
      soClient.find.mockResolvedValue(findResponseWith({ email_exact_match: { enabled: false } }));
      soClient.update.mockResolvedValue({
        id: `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        type: EntityStoreResolutionRuleOverridesTypeName,
        references: [],
        attributes: { overrides: { email_exact_match: { enabled: true } } },
      });

      await client.setEnabled('email_exact_match', true);

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreResolutionRuleOverridesTypeName,
        `${EntityStoreResolutionRuleOverridesTypeName}-${NAMESPACE}`,
        { overrides: { email_exact_match: { enabled: true } } },
        { refresh: 'wait_for', mergeAttributes: true }
      );
    });
  });

  describe('getSavedObjectId', () => {
    it('derives the SO id from the namespace', async () => {
      const other = new ResolutionRuleOverridesClient(soClient, 'space-2', logger);
      soClient.find.mockResolvedValue(emptyFindResponse());
      soClient.create.mockResolvedValue({
        id: `${EntityStoreResolutionRuleOverridesTypeName}-space-2`,
        type: EntityStoreResolutionRuleOverridesTypeName,
        references: [],
        attributes: { overrides: { email_exact_match: { enabled: false } } },
      });

      await other.setEnabled('email_exact_match', false);

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ namespaces: ['space-2'] })
      );
      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreResolutionRuleOverridesTypeName,
        { overrides: { email_exact_match: { enabled: false } } },
        { id: `${EntityStoreResolutionRuleOverridesTypeName}-space-2`, refresh: 'wait_for' }
      );
    });
  });
});
