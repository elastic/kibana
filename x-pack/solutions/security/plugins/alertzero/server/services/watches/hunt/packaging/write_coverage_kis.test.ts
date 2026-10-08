/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { HUNT_COVERAGE_AI_INDEX_ID } from '../../../../../common/step_types/package_report';
import { createCoverageWriter } from './write_coverage_kis';

describe('createCoverageWriter', () => {
  it('records disabled, denied, and storage_failure as distinct skip reasons', async () => {
    const disabled = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => false,
      getEsClient: () => ({
        get: jest.fn(),
        index: jest.fn(),
      }),
    });
    const disabledResult = await disabled([
      {
        kiId: 'ki-1',
        reportId: 'rpt',
        investigationConversationId: 'conv-1',
        title: 't',
        description: 'd',
        content: 'c',
        dataSources: [],
        hasConfirmedHit: false,
      },
    ]);
    expect(disabledResult.skipped[0].reason).toBe('disabled');

    const denied = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({
        get: jest.fn().mockRejectedValue({ statusCode: 403 }),
        index: jest.fn(),
      }),
    });
    const deniedResult = await denied([
      {
        kiId: 'ki-2',
        reportId: 'rpt',
        investigationConversationId: 'conv-1',
        title: 't',
        description: 'd',
        content: 'c',
        dataSources: [],
        hasConfirmedHit: false,
      },
    ]);
    expect(deniedResult.skipped[0].reason).toBe('denied');

    const storage = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({
        get: jest.fn().mockRejectedValue({ statusCode: 404 }),
        index: jest.fn().mockRejectedValue({ statusCode: 500 }),
      }),
    });
    const storageResult = await storage([
      {
        kiId: 'ki-3',
        reportId: 'rpt',
        investigationConversationId: 'conv-1',
        title: 't',
        description: 'd',
        content: 'c',
        dataSources: [],
        hasConfirmedHit: false,
      },
    ]);
    expect(storageResult.skipped[0].reason).toBe('storage_failure');
  });

  const coverageSubject = {
    kiId: 'ki-no-reset',
    reportId: 'rpt',
    investigationConversationId: 'conv-1',
    title: 't',
    description: 'd',
    content: 'c',
    dataSources: [],
    hasConfirmedHit: false,
  };

  it('skips an already-processed item rather than rewriting it', async () => {
    const index = jest.fn();
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({
        get: jest.fn().mockResolvedValue({ _source: { attributes: { status: 'accepted' } } }),
        index,
      }),
    });

    const result = await write([coverageSubject]);

    expect(result.skipped[0].reason).toBe('already_processed');
    expect(index).not.toHaveBeenCalled();
  });

  // The write below stamps `status: pending`, so reaching it without knowing the current status
  // resets an item that may already have been processed. Only a 404 says the item is not there;
  // an error carrying no status code (a connection reset, a timeout) says nothing at all.
  it.each([
    ['no status code', new Error('socket hang up')],
    ['a 503', { statusCode: 503 }],
  ])(
    'treats a get that failed with %s as a storage failure, not a write',
    async (_label, error) => {
      const index = jest.fn();
      const write = createCoverageWriter({
        spaceId: 'default',
        isContextEngineEnabled: async () => true,
        getEsClient: () => ({ get: jest.fn().mockRejectedValue(error), index }),
      });

      const result = await write([coverageSubject]);

      expect(result.skipped[0].reason).toBe('storage_failure');
      expect(index).not.toHaveBeenCalled();
    }
  );

  it('writes when the get proves the item is absent', async () => {
    const index = jest.fn().mockResolvedValue({});
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({ get: jest.fn().mockRejectedValue({ statusCode: 404 }), index }),
    });

    const result = await write([coverageSubject]);

    expect(result.skipped).toEqual([]);
    expect(result.written[0].kiId).toBe(coverageSubject.kiId);
    expect(index).toHaveBeenCalledTimes(1);
  });

  // Context Engine owns the id-to-backing-store mapping, so this asserts the dest its own helper
  // returns rather than a literal: a prefix change there has to reach this writer.
  it('reads and writes the backing store Context Engine maps the AI index id to', async () => {
    const { value: dest } = getAiIndexDest('index', HUNT_COVERAGE_AI_INDEX_ID);
    const get = jest.fn().mockRejectedValue({ statusCode: 404 });
    const index = jest.fn().mockResolvedValue({});
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({ get, index }),
    });

    await write([coverageSubject]);

    expect(get).toHaveBeenCalledWith(expect.objectContaining({ index: dest }));
    expect(index).toHaveBeenCalledWith(expect.objectContaining({ index: dest }));
  });

  it('writes producer v2', async () => {
    const index = jest.fn().mockResolvedValue({});
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({ get: jest.fn().mockRejectedValue({ statusCode: 404 }), index }),
    });

    await write([coverageSubject]);

    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({ producer: 'hunt.packageReport.v2' }),
        }),
      })
    );
  });

  it('writes the enriched attributes when the subject carries them', async () => {
    const index = jest.fn().mockResolvedValue({});
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({ get: jest.fn().mockRejectedValue({ statusCode: 404 }), index }),
    });

    await write([
      {
        ...coverageSubject,
        threatSummary: 'Shadow admin AssumeRole',
        dataSources: ['aws-cloudtrail'],
        severity: 'high',
        investigationSummary: 'Confirmed hit; host-a isolated.',
        hasConfirmedHit: true,
      },
    ]);

    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            threat_summary: 'Shadow admin AssumeRole',
            data_sources: ['aws-cloudtrail'],
            severity: 'high',
            investigation_summary: 'Confirmed hit; host-a isolated.',
            has_confirmed_hit: true,
          }),
        }),
      })
    );
  });

  it('omits enriched attributes rather than writing them empty when the subject has no value', async () => {
    const index = jest.fn().mockResolvedValue({});
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => true,
      getEsClient: () => ({ get: jest.fn().mockRejectedValue({ statusCode: 404 }), index }),
    });

    await write([coverageSubject]);

    const written = index.mock.calls[0][0].document.attributes;
    expect(written).not.toHaveProperty('threat_summary');
    expect(written).not.toHaveProperty('data_sources');
    expect(written).not.toHaveProperty('severity');
    expect(written).not.toHaveProperty('investigation_summary');
  });

  // The gate is a saved objects read, so it can fail on its own. Throwing out of here would
  // fail the whole packaging step and mint no proposals, for a coverage-only concern.
  it('treats an unreadable gate as a storage failure instead of failing the run', async () => {
    const index = jest.fn();
    const write = createCoverageWriter({
      spaceId: 'default',
      isContextEngineEnabled: async () => {
        throw new Error('saved objects client unavailable');
      },
      getEsClient: () => ({ get: jest.fn(), index }),
    });

    const result = await write([coverageSubject]);

    // Not `disabled`: an unread setting does not tell us the feature is off.
    expect(result.skipped).toEqual([
      { kiId: coverageSubject.kiId, subject: expect.any(String), reason: 'storage_failure' },
    ]);
    expect(result.written).toEqual([]);
    expect(index).not.toHaveBeenCalled();
  });
});
