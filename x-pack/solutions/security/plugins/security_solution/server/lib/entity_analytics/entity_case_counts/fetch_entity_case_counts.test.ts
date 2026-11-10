/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { fetchEntityCaseCounts, isCasesForbiddenError } from './fetch_entity_case_counts';

/** A cases client whose lookup answers with the case ids of each attachment id it knows. */
const buildCasesClient = (caseIdsByAttachment: Record<string, string[]>) => {
  const casesClient = createCasesClientMock();
  casesClient.cases.getCasesByAttachmentIDs.mockImplementation(async ({ attachmentIds }) =>
    attachmentIds.flatMap((attachmentId) =>
      caseIdsByAttachment[attachmentId]
        ? [{ attachmentId, caseIds: caseIdsByAttachment[attachmentId] }]
        : []
    )
  );
  return casesClient;
};

describe('fetchEntityCaseCounts', () => {
  it('counts the cases of each entity, asking only for the open and in-progress ones', async () => {
    const casesClient = buildCasesClient({
      'host:a': ['case-1', 'case-2'],
      'host:b': ['case-1'],
    });

    const counts = await fetchEntityCaseCounts(casesClient, ['host:a', 'host:b', 'host:c']);

    expect(counts).toEqual(
      new Map([
        ['host:a', 2],
        ['host:b', 1],
      ])
    );
    expect(casesClient.cases.getCasesByAttachmentIDs).toHaveBeenCalledWith({
      type: 'security.entity',
      owner: 'securitySolution',
      attachmentIds: ['host:a', 'host:b', 'host:c'],
      status: ['open', 'in-progress'],
    });
  });

  it('looks the ids up in batches the cases client accepts', async () => {
    const entityIds = Array.from({ length: 2500 }, (_, i) => `host:${i}`);
    const casesClient = buildCasesClient({ 'host:2400': ['case'] });

    const counts = await fetchEntityCaseCounts(casesClient, entityIds);

    expect(counts).toEqual(new Map([['host:2400', 1]]));
    expect(
      casesClient.cases.getCasesByAttachmentIDs.mock.calls.map(
        ([{ attachmentIds }]) => attachmentIds.length
      )
    ).toEqual([1000, 1000, 500]);
  });

  describe('for a group', () => {
    it('counts the distinct cases of the entity and its members, a shared case once', async () => {
      const casesClient = buildCasesClient({
        'host:head': ['shared', 'own'],
        'host:alias-1': ['shared', 'alias-1-only'],
        'host:alias-2': ['alias-2-only'],
      });

      const counts = await fetchEntityCaseCounts(casesClient, ['host:head'], {
        'host:head': ['host:alias-1', 'host:alias-2'],
      });

      expect(counts).toEqual(new Map([['host:head', 4]]));
    });

    it('counts the cases of the members of an entity that has none of its own', async () => {
      const casesClient = buildCasesClient({ 'host:alias': ['case'] });

      const counts = await fetchEntityCaseCounts(casesClient, ['host:head'], {
        'host:head': ['host:alias'],
      });

      expect(counts).toEqual(new Map([['host:head', 1]]));
    });

    it('looks up the entities and all the members at once', async () => {
      const casesClient = buildCasesClient({});

      await fetchEntityCaseCounts(casesClient, ['host:a', 'host:b'], {
        'host:a': ['host:a1'],
        'host:b': ['host:b1', 'host:b2'],
      });

      expect(casesClient.cases.getCasesByAttachmentIDs).toHaveBeenCalledTimes(1);
      expect(casesClient.cases.getCasesByAttachmentIDs).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentIds: ['host:a', 'host:b', 'host:a1', 'host:b1', 'host:b2'],
        })
      );
    });

    it('does not count the cases of the members of another entity', async () => {
      const casesClient = buildCasesClient({ 'host:a': ['case'], 'host:b': ['case'] });

      const counts = await fetchEntityCaseCounts(casesClient, ['host:a'], {
        'host:other': ['host:b'],
      });

      expect(counts).toEqual(new Map([['host:a', 1]]));
    });
  });

  it('reads nothing without entity ids', async () => {
    const casesClient = buildCasesClient({});

    expect(await fetchEntityCaseCounts(casesClient, [])).toEqual(new Map());
    expect(casesClient.cases.getCasesByAttachmentIDs).not.toHaveBeenCalled();
  });
});

describe('isCasesForbiddenError', () => {
  it('recognizes a forbidden error wrapped by the Cases client', () => {
    expect(isCasesForbiddenError({ wrappedError: Boom.forbidden('no access') })).toBe(true);
  });

  it('does not take other errors for it', () => {
    expect(isCasesForbiddenError({ wrappedError: Boom.badRequest('bad') })).toBe(false);
    expect(isCasesForbiddenError(Boom.forbidden('not wrapped'))).toBe(false);
    expect(isCasesForbiddenError(new Error('boom'))).toBe(false);
  });
});
