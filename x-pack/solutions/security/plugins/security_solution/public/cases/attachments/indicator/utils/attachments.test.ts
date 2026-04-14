/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import { generateMockFileIndicator } from '../../../../../common/threat_intelligence/types/indicator';
import type { IndicatorAttachmentMetadata } from './attachments';
import {
  generateIndicatorAttachmentsMetadata,
  generateIndicatorAttachmentsWithoutOwner,
} from './attachments';

describe('generateIndicatorAttachmentsWithoutOwner', () => {
  it('should return empty array if external reference id is empty', () => {
    const externalReferenceId: string = '';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorType: 'file',
      indicatorFeedName: 'Filebeat] AbuseCH Malwar',
    };

    const result = generateIndicatorAttachmentsWithoutOwner(externalReferenceId, metadata);
    expect(result.length).toBe(0);
  });

  it('should return the correct object', () => {
    const externalReferenceId = 'abc123';
    const metadata: IndicatorAttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorType: 'file',
      indicatorFeedName: 'Filebeat] AbuseCH Malwar',
    };

    const result: CaseAttachmentsWithoutOwner = generateIndicatorAttachmentsWithoutOwner(
      externalReferenceId,
      metadata
    );
    expect(result.length).toBe(1);
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
