/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const vulnerabilitiesTableFieldLabels: Record<string, string> = {
  'resource.id': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.resourceIdColumnLabel',
    { defaultMessage: 'Resource ID' }
  ),
  'resource.name': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.resourceNameColumnLabel',
    { defaultMessage: 'Resource Name' }
  ),
  'vulnerability.id': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.vulnerabilityIdColumnLabel',
    { defaultMessage: 'Vulnerability' }
  ),
  'vulnerability.score.base': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.vulnerabilityScoreColumnLabel',
    { defaultMessage: 'CVSS' }
  ),
  'vulnerability.severity': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.vulnerabilitySeverityColumnLabel',
    { defaultMessage: 'Severity' }
  ),
  'package.name': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.packageNameColumnLabel',
    { defaultMessage: 'Package' }
  ),
  'package.version': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.packageVersionColumnLabel',
    { defaultMessage: 'Version' }
  ),
  'package.fixed_version': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.packageFixedVersionColumnLabel',
    { defaultMessage: 'Fix Version' }
  ),
  'observer.vendor': i18n.translate(
    'xpack.csp.vulnerabilityFindings.vulnerabilityFindingsTable.vulnerabilityFindingsTableColumn.vendorColumnLabel',
    { defaultMessage: 'Vendor' }
  ),
} as const;
