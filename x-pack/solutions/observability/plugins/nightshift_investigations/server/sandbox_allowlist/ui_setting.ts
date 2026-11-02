/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST } from '@kbn/management-settings-ids';
import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  MAX_SANDBOX_ALLOWLIST_RULE_LENGTH,
  validateSandboxAllowlist,
} from '../../common/sandbox_allowlist';

/**
 * Accepts only lists that are already in the normalized form the credential proxy compares
 * against, so writes that bypass the Nightshift route (e.g. the generic settings API) cannot
 * store an unnormalized or invalid rule.
 */
const validateStoredAllowlist = (hosts: string[]): string | undefined => {
  const { hosts: normalized, errors } = validateSandboxAllowlist(hosts);
  if (errors.length > 0) {
    return errors.join('; ');
  }
  const isNormalized =
    normalized.length === hosts.length && normalized.every((host, index) => host === hosts[index]);
  return isNormalized
    ? undefined
    : 'must list unique, canonical lowercase egress firewall rules or hostnames';
};

/**
 * Space-scoped advanced setting holding the per-space sandbox egress firewall rules.
 * Holds no secrets. Hidden from the Advanced Settings page (`readonlyMode: 'ui'`): it is
 * edited in Nightshift settings, behind the Nightshift manage privilege.
 */
export const sandboxAllowlistUiSetting: Record<string, UiSettingsParams<string[]>> = {
  [OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST]: {
    category: ['observability'],
    name: i18n.translate('xpack.nightshiftInvestigations.sandboxAllowlistSettingName', {
      defaultMessage: 'Nightshift sandbox egress allowlist',
    }),
    value: [],
    description: i18n.translate(
      'xpack.nightshiftInvestigations.sandboxAllowlistSettingDescription',
      {
        defaultMessage:
          'Canonical hostnames and egress firewall rules that Nightshift sandbox commands are permitted to reach in this Kibana space.',
      }
    ),
    type: 'array',
    schema: schema.arrayOf(schema.string({ maxLength: MAX_SANDBOX_ALLOWLIST_RULE_LENGTH }), {
      maxSize: MAX_SANDBOX_ALLOWLIST_HOSTS,
      validate: validateStoredAllowlist,
    }),
    requiresPageReload: false,
    // Hostnames are customer data: report only that the value changed, never the list itself.
    sensitive: true,
    solutionViews: ['classic', 'oblt'],
    technicalPreview: true,
    readonly: true,
    readonlyMode: 'ui',
  },
};
