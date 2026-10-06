/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJsonObjectString } from './is_json_object_string';

describe('isJsonObjectString', () => {
  it.each(['{}', '{"username":"elastic"}', '{"retries":3,"options":{"mode":"fast"}}'])(
    'accepts a JSON object: %s',
    (value) => {
      expect(isJsonObjectString(value)).toBe(true);
    }
  );

  it.each(['[]', '["secret"]', '[{"a":"b"}]', '"secret"', '42', 'true', 'null', '{invalid', ''])(
    'rejects anything that is not a JSON object: %s',
    (value) => {
      expect(isJsonObjectString(value)).toBe(false);
    }
  );
});
