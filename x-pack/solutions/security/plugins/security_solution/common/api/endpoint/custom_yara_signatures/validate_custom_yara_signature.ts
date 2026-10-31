/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { DeepMutable } from '../../../endpoint/types';

export const ValidateCustomYaraSignatureRequestSchema = {
  body: schema.object({
    yara_rule: schema.string({
      // Intentionally unbounded here: the request body is capped by `server.maxPayload` (1MB by default),
      // and `validateCustomYaraRule` rejects content over `MAX_YARA_RULE_CONTENT_BYTE_LENGTH` bytes before
      // running libyara. A schema limit would replace that structured diagnostic with a generic 400.
      maxLength: Number.POSITIVE_INFINITY,
    }),
    os_types: schema.arrayOf(
      schema.oneOf([
        schema.literal(OperatingSystem.WINDOWS),
        schema.literal(OperatingSystem.LINUX),
        schema.literal(OperatingSystem.MAC),
      ]),
      { minSize: 1, maxSize: 3 }
    ),
  }),
};

export type ValidateCustomYaraSignatureRequestBody = DeepMutable<
  TypeOf<typeof ValidateCustomYaraSignatureRequestSchema.body>
>;

export interface ValidateCustomYaraSignatureDiagnostic {
  message: string;
  /** 1-based line number (0 if unknown). */
  line: number;
  severity: 'error' | 'warning';
}

export interface ValidateCustomYaraSignatureResponse {
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
  error_count: number;
  warning_count: number;
}
