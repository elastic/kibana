/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinKibanaUrl } from './join_kibana_url';

describe('joinKibanaUrl', () => {
  it('returns a URL that keeps server.basePath', () => {
    expect(joinKibanaUrl('http://127.0.0.1:5601/sbb', '/api/detection_engine/index')).toBe(
      'http://127.0.0.1:5601/sbb/api/detection_engine/index'
    );
  });
});
