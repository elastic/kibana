/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { MAX_BULK_DELETE_ATTACHMENTS } from '@kbn/cases-plugin/common/constants';
import { bulkDeleteCaseAttachments } from './api';

const buildHttp = () => ({ post: jest.fn().mockResolvedValue(undefined) } as unknown as HttpSetup);

describe('bulkDeleteCaseAttachments', () => {
  it('sends every attachment id in a single request', async () => {
    const http = buildHttp();

    await bulkDeleteCaseAttachments({
      http,
      caseId: 'case-1',
      attachmentIds: ['so-attack-1', 'so-alert-1', 'so-alert-2'],
    });

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/api/cases/case-1/comments/_bulk_delete', {
      body: JSON.stringify({ ids: ['so-attack-1', 'so-alert-1', 'so-alert-2'] }),
      signal: undefined,
    });
  });

  it('forwards the abort signal', async () => {
    const http = buildHttp();
    const signal = new AbortController().signal;

    await bulkDeleteCaseAttachments({
      http,
      caseId: 'case-1',
      attachmentIds: ['so-attack-1'],
      signal,
    });

    expect(http.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal }));
  });

  it('makes no request when there is nothing to delete', async () => {
    const http = buildHttp();

    await bulkDeleteCaseAttachments({ http, caseId: 'case-1', attachmentIds: [] });

    expect(http.post).not.toHaveBeenCalled();
  });

  it('batches sets larger than the endpoint limit, sending the first id first', async () => {
    const http = buildHttp();
    const attachmentIds = Array.from(
      { length: MAX_BULK_DELETE_ATTACHMENTS + 3 },
      (_, index) => `so-${index}`
    );

    await bulkDeleteCaseAttachments({ http, caseId: 'case-1', attachmentIds });

    expect(http.post).toHaveBeenCalledTimes(2);
    const [[, first], [, second]] = (http.post as jest.Mock).mock.calls;
    expect(JSON.parse(first.body).ids).toEqual(attachmentIds.slice(0, MAX_BULK_DELETE_ATTACHMENTS));
    expect(JSON.parse(second.body).ids).toEqual(attachmentIds.slice(MAX_BULK_DELETE_ATTACHMENTS));
  });

  it('propagates a failed request', async () => {
    const http = buildHttp();
    (http.post as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(
      bulkDeleteCaseAttachments({ http, caseId: 'case-1', attachmentIds: ['so-attack-1'] })
    ).rejects.toThrow('boom');
  });
});
