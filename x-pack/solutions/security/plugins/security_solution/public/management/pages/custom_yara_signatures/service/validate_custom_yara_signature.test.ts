/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../common/endpoint/constants';
import { validateCustomYaraSignature } from './validate_custom_yara_signature';

describe('validateCustomYaraSignature', () => {
  it('should POST the validate route with versioned JSON body', async () => {
    const http = coreMock.createStart().http;
    const body = {
      yara_rule: 'rule Example { condition: true }',
      os_types: [OperatingSystem.WINDOWS],
    };

    await validateCustomYaraSignature(http, body);

    expect(http.post).toHaveBeenCalledWith(CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE, {
      version: '1',
      body: JSON.stringify(body),
      signal: undefined,
    });
  });
});
