/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { HttpStart } from '@kbn/core/public';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { CUSTOM_YARA_SIGNATURES_LIST_DEFINITION } from '../constants';

export class CustomYaraSignaturesApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(
      http,
      ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      CUSTOM_YARA_SIGNATURES_LIST_DEFINITION
    );
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(
      http,
      ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      CUSTOM_YARA_SIGNATURES_LIST_DEFINITION
    );
  }
}
