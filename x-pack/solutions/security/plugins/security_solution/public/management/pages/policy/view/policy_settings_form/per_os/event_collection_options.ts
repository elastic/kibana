/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import type {
  EventFormOption,
  SupplementalEventFormOption,
} from '../components/event_collection_card';

/** Per-OS supplemental option, adding the control widget to the shared shape. */
export type PerOsSupplementalEventFormOption<OS extends OperatingSystem> =
  SupplementalEventFormOption<OS> & { renderAs?: 'switch' | 'checkbox' };

export const WINDOWS_EVENT_OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.WINDOWS>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dns', {
      defaultMessage: 'DNS',
    }),
    protectionField: 'dns',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.file',
      {
        defaultMessage: 'File',
      }
    ),
    protectionField: 'file',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.network',
      {
        defaultMessage: 'Network',
      }
    ),
    protectionField: 'network',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.process',
      {
        defaultMessage: 'Process',
      }
    ),
    protectionField: 'process',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.security',
      {
        defaultMessage: 'Security',
      }
    ),
    protectionField: 'security',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.credentialAccess',
      {
        defaultMessage: 'API',
      }
    ),
    protectionField: 'credential_access',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dllDriverLoad',
      {
        defaultMessage: 'DLL and Driver Load',
      }
    ),
    protectionField: 'dll_and_driver_load',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.registry',
      {
        defaultMessage: 'Registry',
      }
    ),
    protectionField: 'registry',
  },
];

export const MAC_EVENT_OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.MAC>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.dns', {
      defaultMessage: 'DNS',
    }),
    protectionField: 'dns',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.network', {
      defaultMessage: 'Network',
    }),
    protectionField: 'network',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.process', {
      defaultMessage: 'Process',
    }),
    protectionField: 'process',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.security',
      {
        defaultMessage: 'Security',
      }
    ),
    protectionField: 'security',
  },
];

export const LINUX_EVENT_OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.LINUX>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.dns', {
      defaultMessage: 'DNS',
    }),
    protectionField: 'dns',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.network',
      {
        defaultMessage: 'Network',
      }
    ),
    protectionField: 'network',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.process',
      {
        defaultMessage: 'Process',
      }
    ),
    protectionField: 'process',
  },
];

/** Accessible group name for the Linux supplemental controls, rendered as a hidden legend. */
export const SUPPLEMENTAL_GROUP_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.title',
  {
    defaultMessage: 'Session data',
  }
);

export const LINUX_SUPPLEMENTAL_EVENT_OPTIONS: ReadonlyArray<
  PerOsSupplementalEventFormOption<OperatingSystem.LINUX>
> = [
  {
    tooltipText: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.description',
      {
        defaultMessage:
          'Turn this on to capture the extended process data required for Session View. Session View provides you a visual representation of session and process execution data. Session View data is organized according to the Linux process model to help you investigate process, user, and service activity on your Linux infrastructure.',
      }
    ),
    renderAs: 'switch',
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.label',
      {
        defaultMessage: 'Collect session data',
      }
    ),
    protectionField: 'session_data',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.tty_io.label',
      {
        defaultMessage: 'Capture terminal output',
      }
    ),
    protectionField: 'tty_io',
    tooltipText: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.tty_io.tooltip',
      {
        defaultMessage:
          'Turn this on to collect terminal (tty) output. Terminal output appears in Session View, and you can view it separately to see what commands were executed and how they were typed, provided the terminal is in echo mode. Only works on hosts that support ebpf.',
      }
    ),
  },
];
