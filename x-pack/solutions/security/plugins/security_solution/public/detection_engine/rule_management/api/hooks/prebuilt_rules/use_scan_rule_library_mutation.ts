/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UseMutationOptions } from '@kbn/react-query';
import type {
  ScanRuleLibraryRequestBody,
  ScanRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { SCAN_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { scanRuleLibrary } from '../../api';

export const SCAN_RULE_LIBRARY_KEY = ['POST', SCAN_RULE_LIBRARY_URL];

export const useScanRuleLibraryMutation = (
  options?: UseMutationOptions<ScanRuleLibraryResponseBody, unknown, ScanRuleLibraryRequestBody>
) =>
  useMutation<ScanRuleLibraryResponseBody, unknown, ScanRuleLibraryRequestBody>(scanRuleLibrary, {
    ...options,
    mutationKey: SCAN_RULE_LIBRARY_KEY,
  });
