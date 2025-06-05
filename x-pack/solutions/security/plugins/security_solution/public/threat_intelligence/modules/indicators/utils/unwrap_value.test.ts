/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawIndicatorFieldId } from '../../../../../common/threat_intelligence/types/indicator';
import { unwrapValue } from './unwrap_value';

describe('unwrapValue()', () => {
  it('should return the first field value or null, if not present', () => {
    expect(unwrapValue({ fields: {} }, RawIndicatorFieldId.Type)).toEqual(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(unwrapValue({} as any, RawIndicatorFieldId.Type)).toEqual(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(unwrapValue(null as any, RawIndicatorFieldId.Type)).toEqual(null);

    expect(
      unwrapValue({ fields: { [RawIndicatorFieldId.Type]: ['ip'] } }, RawIndicatorFieldId.Type)
    ).toEqual('ip');

    expect(
      unwrapValue({ fields: { [RawIndicatorFieldId.Type]: [{}] } }, RawIndicatorFieldId.Type)
    ).toEqual(null);
  });
});
