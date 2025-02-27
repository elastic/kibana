/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateMockFileIndicator,
  Indicator,
  RawIndicatorFieldId,
} from '../../../../common/types/indicator';
import { canAddToBlockList } from './can_add_to_block_list';
import { getIndicatorFieldAndValue } from '../../indicators/utils/field_value';

describe('canAddToBlockList', () => {
  it('should return null if indicator has none of required fields', () => {
    const indicator = {} as unknown as Indicator;
    const result = canAddToBlockList(indicator);

    expect(result).toEqual(null);
  });

  it('should return sha256 value if indicator has the field', () => {
    const indicator = generateMockFileIndicator();
    const sha256 = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.FileSha256).value;
    const result = canAddToBlockList(indicator);

    expect(result).toEqual(sha256);
  });

  it('should return sha1 value if sha256 is missing ', () => {
    const indicator = generateMockFileIndicator();
    indicator.fields['threat.indicator.file.hash.sha256'] = undefined;
    const sha1 = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.FileSha1).value;
    const result = canAddToBlockList(indicator);

    expect(result).toEqual(sha1);
  });

  it('should return md5 value if sha256 and sha1 are missing', () => {
    const indicator = generateMockFileIndicator();
    indicator.fields['threat.indicator.file.hash.sha256'] = undefined;
    indicator.fields['threat.indicator.file.hash.sha1'] = undefined;
    const md5 = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.FileMd5).value;
    const result = canAddToBlockList(indicator);

    expect(result).toEqual(md5);
  });
});
