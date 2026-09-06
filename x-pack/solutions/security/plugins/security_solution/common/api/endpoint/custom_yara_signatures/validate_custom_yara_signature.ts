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

/**
 * Character-length DoS bound for `yara_rule`. Higher than the product UTF-8 byte cap
 * (32766) so oversize content still reaches `validateCustomYaraRule` and returns a
 * structured diagnostic instead of a schema 400.
 */
export const MAX_YARA_RULE_VALIDATE_REQUEST_LENGTH = 65532;

export const ValidateCustomYaraSignatureRequestSchema = {
  body: schema.object({
    yara_rule: schema.string({ maxLength: MAX_YARA_RULE_VALIDATE_REQUEST_LENGTH }),
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
