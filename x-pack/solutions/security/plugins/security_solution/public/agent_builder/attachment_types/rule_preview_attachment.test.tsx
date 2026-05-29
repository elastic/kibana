/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_TYPE,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
} from '@kbn/rule-data-utils';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import { DEFAULT_PREVIEW_INDEX, SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  buildRulePreviewMetadataSearchRequest,
  createRulePreviewAttachmentDefinition,
  getRulePreviewAttachmentDataTableId,
  getRulePreviewMetadata,
  registerRulePreviewAttachment,
} from './rule_preview_attachment';

describe('rule preview attachment', () => {
  const alertOriginalTime = 'kibana.alert.original_time';
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;
  const mockServices = {
    data: {},
    getServices: jest.fn(),
    getStore: jest.fn(),
    spaces: {},
  } as unknown as Parameters<typeof registerRulePreviewAttachment>[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the rule preview attachment type', () => {
    registerRulePreviewAttachment({ ...mockServices, attachments: mockAttachments });

    expect(mockAddAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.rulePreview,
      expect.any(Object)
    );
  });

  it('uses attachment label when available', () => {
    const definition = createRulePreviewAttachmentDefinition(mockServices);

    expect(
      definition.getLabel({
        id: 'test',
        type: SecurityAgentBuilderAttachments.rulePreview,
        data: { previewId: 'preview-1', attachmentLabel: 'Custom preview' },
      })
    ).toBe('Custom preview');
  });

  it('builds a unique data table id for the attachment preview', () => {
    expect(getRulePreviewAttachmentDataTableId('preview-1')).toBe(
      'rule-preview-attachment-preview-1'
    );
  });

  it('builds a metadata search request filtered by preview id', () => {
    expect(
      buildRulePreviewMetadataSearchRequest({ previewId: 'preview-1', spaceId: 'default' })
    ).toEqual({
      params: {
        index: `${DEFAULT_PREVIEW_INDEX}-default`,
        size: 5,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: 'preview-1',
                },
              },
            ],
          },
        },
        aggs: {
          minTimestamp: { min: { field: '@timestamp' } },
          maxTimestamp: { max: { field: '@timestamp' } },
          ruleTypes: { terms: { field: ALERT_RULE_TYPE, size: 1 } },
        },
        sort: [
          {
            [alertOriginalTime]: {
              order: 'desc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  it('derives preview metadata from aggregations', () => {
    const metadata = getRulePreviewMetadata({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _id: 'alert-1',
            _source: {
              [alertOriginalTime]: '2026-05-27T13:02:00.000Z',
              [ALERT_SEVERITY]: 'low',
              [ALERT_RISK_SCORE]: 21,
              [ALERT_REASON]: 'event created low alert',
            },
          },
        ],
      },
      aggregations: {
        minTimestamp: { value: 1716800000000 },
        maxTimestamp: { value: 1716800600000 },
        ruleTypes: {
          buckets: [{ key: 'esql', doc_count: 1 }],
        },
      },
    } as never);

    expect(metadata?.ruleType).toBe('esql');
    expect(metadata?.total).toBe(1);
    expect(metadata?.timeframeStart.valueOf()).toBe(1716799999000);
    expect(metadata?.timeframeEnd.valueOf()).toBe(1716800601000);
    expect(metadata?.alerts).toEqual([
      {
        id: 'alert-1',
        originalTime: '2026-05-27T13:02:00.000Z',
        severity: 'low',
        riskScore: '21',
        reason: 'event created low alert',
      },
    ]);
  });

  it('returns undefined when no preview alerts are found', () => {
    const metadata = getRulePreviewMetadata({
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: [],
      },
      aggregations: {},
    } as never);

    expect(metadata).toBeUndefined();
  });
});
