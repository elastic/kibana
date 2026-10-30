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
  MAX_SANDBOX_ALLOWLIST_HOST_LENGTH,
  validateSandboxAllowlist,
} from '../../common/sandbox_allowlist';

/**
 * Accepts only lists that are already in the normalized form the credential proxy compares
 * against, so writes that bypass the Nightshift route (e.g. the generic settings API) can neither
 * store a wildcard nor a host the proxy would read differently.
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
    : 'must list unique, lowercase, punycode hostnames without a trailing dot';
};

/**
 * Space-scoped advanced setting holding the hosts that may receive real sandbox credential
 * values. Holds no secrets. Hidden from the Advanced Settings page (`readonlyMode: 'ui'`): it is
 * edited in Nightshift settings, behind the Nightshift manage privilege.
 */
export const sandboxAllowlistUiSetting: Record<string, UiSettingsParams<string[]>> = {
  [OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST]: {
    category: ['observability'],
    name: i18n.translate('xpack.nightshiftInvestigations.sandboxAllowlistSettingName', {
      defaultMessage: 'Nightshift sandbox credential allowlist',
    }),
    value: [],
    description: i18n.translate(
      'xpack.nightshiftInvestigations.sandboxAllowlistSettingDescription',
      {
        defaultMessage:
          'Exact hostnames that Nightshift sandbox commands may send connector credentials and sandbox secrets to in this Kibana space. Commands that need credentials fail while the list is empty.',
      }
    ),
    type: 'array',
    schema: schema.arrayOf(schema.string({ maxLength: MAX_SANDBOX_ALLOWLIST_HOST_LENGTH }), {
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
