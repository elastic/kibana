/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { BriefResponse } from '../../../../common/entity_analytics/executive_brief/document';
import {
  BRIEF_ROUTE,
  EXECUTIVE_BRIEF_TAGS,
  INTERNAL_HEADERS,
  briefRouteInSpace,
} from '../fixtures/constants';
import {
  countStoredBriefs,
  createBriefConnector,
  createProxyConnector,
  deleteAllBriefs,
  deleteBriefConnector,
  generateBrief,
  getBriefDocId,
  readStoredBrief,
} from '../fixtures/brief_helpers';

const OTHER_SPACE_ID = 'executive-brief-other-space';

/** A brief is private: readable only by its owner, in the space where it was generated. */
apiTest.describe('Executive brief - ownership', { tag: EXECUTIVE_BRIEF_TAGS }, () => {
  let ownerHeaders: Record<string, string>;
  let otherUserHeaders: Record<string, string>;
  let connectorId: string;
  let otherSpaceConnectorId: string;
  let llmProxy: LlmProxy;

  apiTest.beforeAll(async ({ apiServices, samlAuth, log }) => {
    const owner = await samlAuth.asInteractiveUser('admin');
    ownerHeaders = { ...INTERNAL_HEADERS, ...owner.cookieHeader };
    // `editor` has Entity Analytics access, so a 404 can only come from the owner filter.
    const otherUser = await samlAuth.asInteractiveUser('editor');
    otherUserHeaders = { ...INTERNAL_HEADERS, ...otherUser.cookieHeader };

    await apiServices.spaces.create({ id: OTHER_SPACE_ID });
    ({ connectorId, llmProxy } = await createBriefConnector({ apiServices, log }));
    otherSpaceConnectorId = await createProxyConnector({
      apiServices,
      llmProxy,
      spaceId: OTHER_SPACE_ID,
    });
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteAllBriefs(esClient);
    llmProxy.clear();
  });

  apiTest.afterAll(async ({ apiServices, esClient }) => {
    await deleteAllBriefs(esClient);
    await deleteBriefConnector({ apiServices, connectorId, llmProxy });
    await apiServices.spaces.delete(OTHER_SPACE_ID);
  });

  apiTest('another user can neither read nor delete the brief', async ({ apiClient }) => {
    const { jobId } = await generateBrief({
      apiClient,
      headers: ownerHeaders,
      connectorId,
      llmProxy,
    });

    const read = await apiClient.get(BRIEF_ROUTE, {
      headers: otherUserHeaders,
      responseType: 'json',
    });
    expect(read).toHaveStatusCode(404);

    const deleted = await apiClient.delete(BRIEF_ROUTE, {
      headers: otherUserHeaders,
      responseType: 'json',
    });
    expect(deleted).toHaveStatusCode(200);
    expect(deleted.body).toStrictEqual({ deleted: false });

    const ownerRead = await apiClient.get<BriefResponse>(BRIEF_ROUTE, {
      headers: ownerHeaders,
      responseType: 'json',
    });
    expect(ownerRead).toHaveStatusCode(200);
    expect(ownerRead.body.job).toMatchObject({ id: jobId, status: 'succeeded' });
  });

  apiTest(
    'the brief is only visible in the space where it was generated',
    async ({ apiClient, esClient }) => {
      const { jobId } = await generateBrief({
        apiClient,
        headers: ownerHeaders,
        connectorId,
        llmProxy,
      });

      const otherSpaceRead = await apiClient.get(briefRouteInSpace(OTHER_SPACE_ID), {
        headers: ownerHeaders,
        responseType: 'json',
      });
      expect(otherSpaceRead).toHaveStatusCode(404);

      // A brief in the other space is a separate document and leaves the first one untouched.
      const { jobId: otherSpaceJobId } = await generateBrief({
        apiClient,
        headers: ownerHeaders,
        connectorId: otherSpaceConnectorId,
        llmProxy,
        route: briefRouteInSpace(OTHER_SPACE_ID),
      });
      expect(otherSpaceJobId).not.toBe(jobId);

      const defaultSpaceRead = await apiClient.get<BriefResponse>(BRIEF_ROUTE, {
        headers: ownerHeaders,
        responseType: 'json',
      });
      expect(defaultSpaceRead.body.job.id).toBe(jobId);

      const { ownerId } = await getBriefDocId({
        apiClient,
        headers: ownerHeaders,
        spaceId: 'default',
      });
      expect(await countStoredBriefs(esClient, ownerId)).toBe(2);
    }
  );

  apiTest('a second generate replaces the first brief', async ({ apiClient, esClient }) => {
    const { jobId: firstJobId } = await generateBrief({
      apiClient,
      headers: ownerHeaders,
      connectorId,
      llmProxy,
    });
    const { jobId: secondJobId, document } = await generateBrief({
      apiClient,
      headers: ownerHeaders,
      connectorId,
      llmProxy,
    });

    expect(secondJobId).not.toBe(firstJobId);
    expect(document.job).toMatchObject({ id: secondJobId, status: 'succeeded' });

    // Same document (deterministic id per owner and space), now holding the second job.
    const { docId, ownerId } = await getBriefDocId({
      apiClient,
      headers: ownerHeaders,
      spaceId: 'default',
    });
    const stored = await readStoredBrief(esClient, docId);
    expect(stored).toMatchObject({
      schema_version: 1,
      owner: { id: ownerId },
      space_id: 'default',
      job: { id: secondJobId, status: 'succeeded' },
    });
    expect(await countStoredBriefs(esClient, ownerId)).toBe(1);
  });
});
