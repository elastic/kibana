/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; no use of this file is permitted save in accordance with such license.
 */

import type { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import { NATIVE_VULN_SCANNER_VENDOR } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';

export const isNativeScannerFinding = (finding: CspVulnerabilityFinding): boolean =>
  finding.vulnerability?.scanner?.vendor === NATIVE_VULN_SCANNER_VENDOR;
