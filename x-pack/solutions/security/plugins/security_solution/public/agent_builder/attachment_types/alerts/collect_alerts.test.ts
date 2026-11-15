/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { collectAlerts } from './collect_alerts';

const singleAlert = (id: string, index: string, createdAt?: string): UnknownAttachment => ({
  id: `attachment-${id}`,
  type: SecurityAgentBuilderAttachments.alert,
  data: { alert: JSON.stringify({ _id: [id], _index: [index] }) },
  ...(createdAt && {
    versionData: { version: 1, versionCount: 1, createdAt, originSyncedAt: undefined },
  }),
});

const alertBatch = (alertIds: unknown[], createdAt?: string): UnknownAttachment => ({
  id: 'attachment-batch',
  type: SecurityAgentBuilderAttachments.alerts,
  data: { alertIds },
  ...(createdAt && {
    versionData: { version: 1, versionCount: 1, createdAt, originSyncedAt: undefined },
  }),
});

describe('collectAlerts', () => {
  it('merges single alerts and batches, counting an alert named twice once', () => {
    const { ids } = collectAlerts([
      singleAlert('a', '.alerts-1'),
      alertBatch(['a', 'b']),
      singleAlert('c', '.alerts-1'),
    ]);

    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the concrete index of a single alert for its flyout', () => {
    const { descriptors } = collectAlerts([singleAlert('a', '.alerts-1'), alertBatch(['a'])]);

    expect(descriptors.get('a')).toEqual({
      kind: 'document',
      documentId: 'a',
      indexName: '.alerts-1',
    });
  });

  it('ignores ids that are not strings and payloads that name nothing', () => {
    const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});

    const { ids } = collectAlerts([
      alertBatch(['a', 1, null]),
      { id: 'x', type: SecurityAgentBuilderAttachments.alert, data: { alert: 'prose' } },
    ]);

    expect(ids).toEqual(['a']);
    warn.mockRestore();
  });

  it('warns once, naming the attachment, when an alert is prose only', () => {
    const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
    const prose = {
      id: 'prose-1',
      type: SecurityAgentBuilderAttachments.alert,
      data: { alert: 'High volume of process executions' },
    };

    collectAlerts([prose]);
    collectAlerts([prose]);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('prose-1'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no alert id could be found'));
    warn.mockRestore();
  });

  it('counts an alert that has an id but no index, without a flyout descriptor', () => {
    const { ids, descriptors } = collectAlerts([
      {
        id: 'no-index',
        type: SecurityAgentBuilderAttachments.alert,
        data: { alert: JSON.stringify({ _id: ['a'] }) },
      },
    ]);

    expect(ids).toEqual(['a']);
    expect(descriptors.size).toBe(0);
  });

  it('reports the earliest creation time', () => {
    const { createdAt } = collectAlerts([
      alertBatch(['a'], '2026-09-02T00:00:00.000Z'),
      singleAlert('b', '.alerts-1', '2026-09-01T00:00:00.000Z'),
    ]);

    expect(createdAt).toBe('2026-09-01T00:00:00.000Z');
  });
});
