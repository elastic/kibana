/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { VULNERABILITY_GROUPING_OPTIONS } from '../../common/constants';

export const VULNERABILITIES = i18n.translate('xpack.csp.vulnerabilities', {
  defaultMessage: 'Vulnerabilities',
});

export const VULNERABILITIES_UNIT = (totalCount: number) =>
  i18n.translate('xpack.csp.vulnerabilities.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {vulnerability} other {vulnerabilities}}`,
  });

export const VULNERABILITIES_GROUPS_UNIT = (
  totalCount: number,
  selectedGroup: string,
  hasNullGroup: boolean
) => {
  const groupCount = hasNullGroup ? totalCount - 1 : totalCount;

  switch (selectedGroup) {
    case VULNERABILITY_GROUPING_OPTIONS.RESOURCE_ID:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.resource', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {resource} other {resources}}`,
      });
    case VULNERABILITY_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.cloudAccount', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {cloud account} other {cloud accounts}}`,
      });
    case VULNERABILITY_GROUPING_OPTIONS.CVE:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.cve', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {CVE} other {CVEs}}`,
      });
    default:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {group} other {groups}}`,
      });
  }
};

export const NULL_GROUPING_UNIT = i18n.translate(
  'xpack.csp.vulnerabilities.grouping.nullGroupUnit',
  {
    defaultMessage: 'vulnerabilities',
  }
);

export const NULL_GROUPING_MESSAGES = {
  RESOURCE_ID: i18n.translate('xpack.csp.vulnerabilities.grouping.resource.nullGroupTitle', {
    defaultMessage: 'No resource',
  }),
  CLOUD_ACCOUNT_ID: i18n.translate(
    'xpack.csp.vulnerabilities.grouping.cloudAccount.nullGroupTitle',
    {
      defaultMessage: 'No cloud account',
    }
  ),
  DEFAULT: i18n.translate('xpack.csp.vulnerabilities.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const GROUPING_LABELS = {
  RESOURCE: i18n.translate('xpack.csp.vulnerabilities.groupBy.resource', {
    defaultMessage: 'Resource ID',
  }),
  CLOUD_ACCOUNT: i18n.translate('xpack.csp.vulnerabilities.groupBy.cloudAccount', {
    defaultMessage: 'Cloud account ID',
  }),
};

export const groupingTitle = i18n.translate('xpack.csp.vulnerabilities.groupBy', {
  defaultMessage: 'Group vulnerabilities by',
});
