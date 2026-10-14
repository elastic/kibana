/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { INDICATOR_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';
import { generateMockFileIndicator } from '../../../../common/threat_intelligence/types/indicator';
import type { IndicatorAttachmentMetadata } from '.';
import { generateIndicatorAttachmentsMetadata, generateIndicatorAttachmentsWithoutOwner } from '.';

describe('generateIndicatorAttachmentsWithoutOwner', () => {
  it('should return empty array if indicator id is empty', () => {
    const indicatorId: string = '';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorType: 'file',
      indicatorFeedName: 'Filebeat] AbuseCH Malwar',
    };

    const result = generateIndicatorAttachmentsWithoutOwner(indicatorId, metadata);
    expect(result.length).toBe(0);
  });

  it('should return a unified `indicator` attachment payload', () => {
    const indicatorId = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorType: 'file',
      indicatorFeedName: 'Filebeat] AbuseCH Malwar',
    };

    const result: CaseAttachmentsWithoutOwner = generateIndicatorAttachmentsWithoutOwner(
      indicatorId,
      metadata
    );
    expect(result).toEqual([
      {
        type: INDICATOR_ATTACHMENT_TYPE,
        attachmentId: indicatorId,
        metadata,
      },
    ]);
  });
});

describe('generateAttachmentsMetadata', () => {
  it('should return an object of empty string for invalid indicator', () => {
    const indicator = {} as unknown as Indicator;
    const result = generateIndicatorAttachmentsMetadata(indicator);

    expect(result).toEqual({
      indicatorName: '-',
      indicatorType: '-',
      indicatorFeedName: '-',
    });
  });

  it('should return a proper object', () => {
    const indicator = generateMockFileIndicator();
    const result = generateIndicatorAttachmentsMetadata(indicator);

    expect(result.indicatorName).not.toEqual('');
    expect(result.indicatorType).not.toEqual('');
    expect(result.indicatorFeedName).not.toEqual('');
  });
});
