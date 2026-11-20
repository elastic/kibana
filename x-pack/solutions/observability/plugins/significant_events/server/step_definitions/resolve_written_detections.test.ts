/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  MAX_RUN_VERSIONS,
  resolveStampRules,
  resolveWrittenDetectionsStepDefinition,
} from './resolve_written_detections';
import { RuleEventsClient } from '../lib/significant_events/events/rule_events_client';

jest.mock('../lib/significant_events/events/rule_events_client');

const batch = [
  { detection_id: 'detection-a', rule_uuid: 'rule-a' },
  { detection_id: 'detection-b', rule_uuid: 'rule-b' },
];

describe('resolveStampRules', () => {
  it('unions rules derived from written signals with reported batch rules', () => {
    expect(
      resolveStampRules({
        batch,
        reportedRuleUuids: ['rule-b', 'unknown-rule'],
        runWrittenPairs: [{ detection_id: 'detection-a', rule_uuid: 'rule-a' }],
      })
    ).toEqual({
      stamp_rule_uuids: ['rule-a', 'rule-b'],
      derived_count: 1,
      unknown_reported_count: 1,
    });
  });

  it('does not derive a batch rule from an out-of-batch detection', () => {
    expect(
      resolveStampRules({
        batch,
        reportedRuleUuids: [],
        runWrittenPairs: [{ detection_id: 'not-in-batch', rule_uuid: 'rule-a' }],
      })
    ).toEqual({
      stamp_rule_uuids: [],
      derived_count: 0,
      unknown_reported_count: 0,
    });
  });

  it('uses stored signal pairings and rejects mismatched batch metadata', () => {
    expect(
      resolveStampRules({
        batch,
        reportedRuleUuids: [],
        runWrittenPairs: [{ detection_id: 'detection-a', rule_uuid: 'rule-b' }],
      })
    ).toEqual({
      stamp_rule_uuids: [],
      derived_count: 0,
      unknown_reported_count: 0,
    });
  });

  it('keeps validated reported rules when no version was written', () => {
    expect(
      resolveStampRules({
        batch,
        reportedRuleUuids: ['rule-b'],
        runWrittenPairs: [],
      })
    ).toEqual({
      stamp_rule_uuids: ['rule-b'],
      derived_count: 0,
      unknown_reported_count: 0,
    });
  });
});

describe('resolveWrittenDetectionsStepDefinition handler', () => {
  const findDetectionsWrittenByRun = jest.fn();
  const esClient = { esql: { query: jest.fn() } };

  const run = async () => {
    const logger = loggerMock.create();
    const input = {
      space_id: 'default',
      workflow_execution_id: 'execution-1',
      batch,
      reported_rule_uuids: ['rule-b'],
    };
    const { output } = await resolveWrittenDetectionsStepDefinition({ logger }).handler({
      input,
      rawInput: input,
      contextManager: { getScopedEsClient: jest.fn(() => esClient) },
      abortSignal: new AbortController().signal,
    } as never);
    return { output, logger };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (RuleEventsClient as jest.Mock).mockImplementation(() => ({ findDetectionsWrittenByRun }));
  });

  it('looks up the run in the input space and stamps without warning', async () => {
    findDetectionsWrittenByRun.mockResolvedValue({
      pairs: [{ detection_id: 'detection-a', rule_uuid: 'rule-a' }],
      truncated: false,
    });

    const { output, logger } = await run();

    expect(RuleEventsClient).toHaveBeenCalledWith({ esClient, space: 'default' });
    expect(findDetectionsWrittenByRun).toHaveBeenCalledWith({
      workflowExecutionId: 'execution-1',
      limit: MAX_RUN_VERSIONS,
    });
    expect(output).toEqual({
      stamp_rule_uuids: ['rule-a', 'rule-b'],
      derived_count: 1,
      unknown_reported_count: 0,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to the reported rules and warns when the lookup throws, without failing the step', async () => {
    findDetectionsWrittenByRun.mockRejectedValue(new Error('es unavailable'));

    const { output, logger } = await run();

    expect(output).toEqual({
      stamp_rule_uuids: ['rule-b'],
      derived_count: 0,
      unknown_reported_count: 0,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('execution-1'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es unavailable'));
  });

  it('keeps the pairs read and warns about the limit when the lookup is truncated', async () => {
    findDetectionsWrittenByRun.mockResolvedValue({
      pairs: [{ detection_id: 'detection-a', rule_uuid: 'rule-a' }],
      truncated: true,
    });

    const { output, logger } = await run();

    expect(output).toEqual({
      stamp_rule_uuids: ['rule-a', 'rule-b'],
      derived_count: 1,
      unknown_reported_count: 0,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`${MAX_RUN_VERSIONS}`));
  });
});
