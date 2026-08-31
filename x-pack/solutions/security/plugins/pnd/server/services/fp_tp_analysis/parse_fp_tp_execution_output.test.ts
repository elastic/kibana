/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOCK_FP_TP_FAILURE,
  MOCK_FP_TP_INCONCLUSIVE_RESULT,
  MOCK_FP_TP_TRUE_POSITIVE_RESULT,
} from '@kbn/pnd-common';
import { parseFpTpExecutionOutput } from './parse_fp_tp_execution_output';

const ids = {
  attackDiscoveryId: 'ad-001',
  investigationId: 'inv-001',
};

describe('parseFpTpExecutionOutput', () => {
  it('returns a completed true-positive result', () => {
    const parsed = parseFpTpExecutionOutput({
      ...ids,
      output: MOCK_FP_TP_TRUE_POSITIVE_RESULT,
    });

    expect(parsed).toEqual({
      kind: 'completed',
      result: MOCK_FP_TP_TRUE_POSITIVE_RESULT,
    });
  });

  it('returns a completed inconclusive result', () => {
    const parsed = parseFpTpExecutionOutput({
      attackDiscoveryId: MOCK_FP_TP_INCONCLUSIVE_RESULT.attack_discovery_id,
      investigationId: MOCK_FP_TP_INCONCLUSIVE_RESULT.investigation_id,
      output: MOCK_FP_TP_INCONCLUSIVE_RESULT,
    });

    expect(parsed).toEqual({
      kind: 'completed',
      result: MOCK_FP_TP_INCONCLUSIVE_RESULT,
    });
  });

  it('returns a failure result with no classification', () => {
    const parsed = parseFpTpExecutionOutput({
      attackDiscoveryId: MOCK_FP_TP_FAILURE.attack_discovery_id,
      investigationId: MOCK_FP_TP_FAILURE.investigation_id,
      output: MOCK_FP_TP_FAILURE,
    });

    expect(parsed).toEqual({
      kind: 'failed',
      result: MOCK_FP_TP_FAILURE,
    });
  });

  it('maps malformed output to a retryable failure rather than a classification', () => {
    const parsed = parseFpTpExecutionOutput({
      ...ids,
      output: { classification: 'false_positive' },
    });

    expect(parsed).toEqual({
      kind: 'failed',
      result: {
        status: 'failed',
        attack_discovery_id: ids.attackDiscoveryId,
        investigation_id: ids.investigationId,
        error: {
          code: 'malformed_model_output',
          message:
            'Assessment output did not validate against the FP/TP result or failure contract.',
          retryable: true,
        },
      },
    });
  });

  it('maps an unknown schema_version to a failure rather than best-effort parsing', () => {
    const parsed = parseFpTpExecutionOutput({
      ...ids,
      output: {
        ...MOCK_FP_TP_TRUE_POSITIVE_RESULT,
        schema_version: '2',
      },
    });

    expect(parsed).toEqual({
      kind: 'failed',
      result: {
        status: 'failed',
        attack_discovery_id: ids.attackDiscoveryId,
        investigation_id: ids.investigationId,
        error: {
          code: 'unknown_schema_version',
          message: 'Unsupported FP/TP schema_version: 2',
          retryable: false,
        },
      },
    });
  });
});
