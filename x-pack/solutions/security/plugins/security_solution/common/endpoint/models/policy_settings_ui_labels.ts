/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLICY_EVENT_COLLECTION_LABELS = {
  windows: [
    {
      field: 'credential_access',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.credentialAccess',
        {
          defaultMessage: 'API',
        }
      ),
    },
    {
      field: 'dll_and_driver_load',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dllDriverLoad',
        {
          defaultMessage: 'DLL and Driver Load',
        }
      ),
    },
    {
      field: 'dns',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dns',
        {
          defaultMessage: 'DNS',
        }
      ),
    },
    {
      field: 'file',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.file',
        {
          defaultMessage: 'File',
        }
      ),
    },
    {
      field: 'network',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.network',
        {
          defaultMessage: 'Network',
        }
      ),
    },
    {
      field: 'process',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.process',
        {
          defaultMessage: 'Process',
        }
      ),
    },
    {
      field: 'registry',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.registry',
        {
          defaultMessage: 'Registry',
        }
      ),
    },
    {
      field: 'security',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.security',
        {
          defaultMessage: 'Security',
        }
      ),
    },
  ],
  mac: [
    {
      field: 'dns',
      label: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.dns', {
        defaultMessage: 'DNS',
      }),
    },
    {
      field: 'file',
      label: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.file', {
        defaultMessage: 'File',
      }),
    },
    {
      field: 'process',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.process',
        {
          defaultMessage: 'Process',
        }
      ),
    },
    {
      field: 'network',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.network',
        {
          defaultMessage: 'Network',
        }
      ),
    },
    {
      field: 'security',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.security',
        {
          defaultMessage: 'Security',
        }
      ),
    },
  ],
  linux: [
    {
      field: 'dns',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.dns',
        {
          defaultMessage: 'DNS',
        }
      ),
    },
    {
      field: 'file',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.file',
        {
          defaultMessage: 'File',
        }
      ),
    },
    {
      field: 'process',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.process',
        {
          defaultMessage: 'Process',
        }
      ),
    },
    {
      field: 'network',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.network',
        {
          defaultMessage: 'Network',
        }
      ),
    },
    {
      field: 'session_data',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.label',
        {
          defaultMessage: 'Collect session data',
        }
      ),
    },
    {
      field: 'tty_io',
      label: i18n.translate(
        'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.tty_io.label',
        {
          defaultMessage: 'Capture terminal output',
        }
      ),
    },
  ],
} as const satisfies Readonly<
  Record<'windows' | 'mac' | 'linux', ReadonlyArray<{ field: string; label: string }>>
>;

export const POLICY_PROTECTION_UPDATES_LABEL = {
  path: 'global_manifest_version',
  label: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.protectionUpdates', {
    defaultMessage: 'Protection updates',
  }),
} as const;

export const POLICY_PROTECTION_FAMILY_TITLES: Readonly<
  Record<'malware' | 'ransomware' | 'memory_protection' | 'behavior_protection', string>
> = {
  malware: i18n.translate('xpack.securitySolution.endpoint.policy.details.malware', {
    defaultMessage: 'Malware',
  }),
  ransomware: i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
    defaultMessage: 'Ransomware',
  }),
  memory_protection: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.memory_protection',
    {
      defaultMessage: 'Memory threat',
    }
  ),
  behavior_protection: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.behavior_protection',
    {
      defaultMessage: 'Malicious behavior',
    }
  ),
};
