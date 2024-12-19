/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DocLinks } from '@kbn/doc-links';
import { HostPolicyResponseActionStatus } from '../../../../common/endpoint/types';
import type {
  HostPolicyResponseAppliedAction,
  ImmutableObject,
} from '../../../../common/endpoint/types';

type PolicyResponseSections =
  | 'logging'
  | 'streaming'
  | 'malware'
  | 'events'
  | 'memory_protection'
  | 'behavior_protection';

const policyResponseSections = Object.freeze(
  new Map<PolicyResponseSections | string, string>([
    [
      'logging',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.logging', {
        defaultMessage: 'Logging',
      }),
    ],
    [
      'streaming',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.streaming', {
        defaultMessage: 'Streaming',
      }),
    ],
    [
      'malware',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.malware', {
        defaultMessage: 'Malware',
      }),
    ],
    [
      'events',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.events', {
        defaultMessage: 'Events',
      }),
    ],
    [
      'memory_protection',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.memory_protection', {
        defaultMessage: 'Memory Threat',
      }),
    ],
    [
      'behavior_protection',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.behavior_protection', {
        defaultMessage: 'Malicious Behavior',
      }),
    ],
  ])
);

/**
 * Maps a server provided value to corresponding i18n'd string.
 */
export function formatResponse(responseString: PolicyResponseSections | string) {
  if (policyResponseSections.has(responseString)) {
    return policyResponseSections.get(responseString);
  }

  // Its possible for the UI to receive an Action name that it does not yet have a translation,
  // thus we generate a label for it here by making it more user fiendly
  policyResponseSections.set(
    responseString,
    responseString.replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase())
  );

  return policyResponseSections.get(responseString);
}

type PolicyResponseAction =
  | 'configure_dns_events'
  | 'configure_dns_events'
  | 'configure_elasticsearch_connection'
  | 'configure_file_events'
  | 'configure_imageload_events'
  | 'configure_kernel'
  | 'configure_logging'
  | 'configure_malware'
  | 'configure_network_events'
  | 'configure_process_events'
  | 'configure_registry_events'
  | 'configure_security_events'
  | 'connect_kernel'
  | 'detect_async_image_load_events'
  | 'detect_file_open_events'
  | 'detect_file_write_events'
  | 'detect_network_events'
  | 'detect_process_events'
  | 'detect_registry_events'
  | 'detect_sync_image_load_events'
  | 'download_global_artifacts'
  | 'download_user_artifacts'
  | 'load_config'
  | 'load_malware_model'
  | 'read_elasticsearch_config'
  | 'read_events_config'
  | 'read_kernel_config'
  | 'read_logging_config'
  | 'read_malware_config'
  | 'workflow'
  | 'full_disk_access';

export const policyResponseTitles = Object.freeze(
  new Map<PolicyResponseAction | string, string>([
    [
      'configure_dns_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_dns_events',
        {
          defaultMessage: 'Configure DNS Events',
        }
      ),
    ],
    [
      'configure_elasticsearch_connection',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_elasticsearch_connection',
        { defaultMessage: 'Configure Elasticsearch Connection' }
      ),
    ],
    [
      'configure_file_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_file_events',
        {
          defaultMessage: 'Configure File Events',
        }
      ),
    ],
    [
      'configure_imageload_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_imageload_events',
        { defaultMessage: 'Configure Image Load Events' }
      ),
    ],
    [
      'configure_kernel',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.configure_kernel', {
        defaultMessage: 'Configure Kernel',
      }),
    ],
    [
      'configure_logging',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.configure_logging', {
        defaultMessage: 'Configure Logging',
      }),
    ],
    [
      'configure_malware',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.configure_malware', {
        defaultMessage: 'Configure Malware',
      }),
    ],
    [
      'configure_network_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_network_events',
        { defaultMessage: 'Configure Network Events' }
      ),
    ],
    [
      'configure_process_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_process_events',
        { defaultMessage: 'Configure Process Events' }
      ),
    ],
    [
      'configure_registry_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_registry_events',
        { defaultMessage: 'Configure Registry Events' }
      ),
    ],
    [
      'configure_security_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.configure_security_events',
        { defaultMessage: 'Configure Security Events' }
      ),
    ],
    [
      'connect_kernel',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.connect_kernel', {
        defaultMessage: 'Connect Kernel',
      }),
    ],
    [
      'detect_async_image_load_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_async_image_load_events',
        { defaultMessage: 'Detect Async Image Load Events' }
      ),
    ],
    [
      'detect_file_open_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_file_open_events',
        { defaultMessage: 'Detect File Open Events' }
      ),
    ],
    [
      'detect_file_write_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_file_write_events',
        { defaultMessage: 'Detect File Write Events' }
      ),
    ],
    [
      'detect_network_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_network_events',
        {
          defaultMessage: 'Detect Network Events',
        }
      ),
    ],
    [
      'detect_process_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_process_events',
        {
          defaultMessage: 'Detect Process Events',
        }
      ),
    ],
    [
      'detect_registry_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_registry_events',
        { defaultMessage: 'Detect Registry Events' }
      ),
    ],
    [
      'detect_sync_image_load_events',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.detect_sync_image_load_events',
        { defaultMessage: 'Detect Sync Image Load Events' }
      ),
    ],
    [
      'download_global_artifacts',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.download_global_artifacts',
        { defaultMessage: 'Download Global Artifacts' }
      ),
    ],
    [
      'download_user_artifacts',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.download_user_artifacts',
        { defaultMessage: 'Download User Artifacts' }
      ),
    ],
    [
      'load_config',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.load_config', {
        defaultMessage: 'Load Config',
      }),
    ],
    [
      'load_malware_model',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.load_malware_model', {
        defaultMessage: 'Load Malware Model',
      }),
    ],
    [
      'read_elasticsearch_config',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.read_elasticsearch_config',
        { defaultMessage: 'Read Elasticsearch Config' }
      ),
    ],
    [
      'read_events_config',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.read_events_config', {
        defaultMessage: 'Read Events Config',
      }),
    ],
    [
      'read_kernel_config',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.read_kernel_config', {
        defaultMessage: 'Read Kernel Config',
      }),
    ],
    [
      'read_logging_config',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.read_logging_config', {
        defaultMessage: 'Read Logging Config',
      }),
    ],
    [
      'read_malware_config',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.read_malware_config', {
        defaultMessage: 'Read Malware Config',
      }),
    ],
    [
      'workflow',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.workflow', {
        defaultMessage: 'Workflow',
      }),
    ],
    [
      'full_disk_access',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.full_disk_access', {
        defaultMessage: 'Full Disk Access',
      }),
    ],
    [
      'macos_system_ext',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.macos_system_ext', {
        defaultMessage: 'Permissions required',
      }),
    ],
    [
      'linux_deadlock',
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.linux_deadlock', {
        defaultMessage: 'Disabled to avoid potential system deadlock',
      }),
    ],
  ])
);

type PolicyResponseStatus = `${HostPolicyResponseActionStatus}`;

const policyResponseStatuses = Object.freeze(
  new Map<PolicyResponseStatus, string>([
    [
      HostPolicyResponseActionStatus.success,
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.success', {
        defaultMessage: 'Success',
      }),
    ],
    [
      HostPolicyResponseActionStatus.warning,
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.warning', {
        defaultMessage: 'Warning',
      }),
    ],
    [
      HostPolicyResponseActionStatus.failure,
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.failed', {
        defaultMessage: 'Failed',
      }),
    ],
    [
      HostPolicyResponseActionStatus.unsupported,
      i18n.translate('xpack.securitySolution.endpoint.details.policyResponse.unsupported', {
        defaultMessage: 'Unsupported',
      }),
    ],
  ])
);

export const descriptions = Object.freeze(
  new Map<Partial<PolicyResponseAction> | string, string>([
    [
      'full_disk_access',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.description.full_disk_access',
        {
          defaultMessage: 'You must enable full disk access for Elastic Endpoint on your machine.',
        }
      ),
    ],
    [
      'macos_system_ext',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.description.macos_system_ext',
        {
          defaultMessage:
            'You must enable the Mac system extension for Elastic Endpoint on your machine.',
        }
      ),
    ],
    [
      'linux_deadlock',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.description.linux_deadlock',
        {
          defaultMessage:
            'Malware protection was disabled to avoid a potential system deadlock. To resolve this issue, the file systems causing this need to be identified in integration policy advanced settings (linux.advanced.fanotify.ignored_filesystems). Learn more in our',
        }
      ),
    ],
  ])
);

const linkTexts = Object.freeze(
  new Map<Partial<PolicyResponseAction> | string, string>([
    [
      'full_disk_access',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.link.text.full_disk_access',
        {
          defaultMessage: ' Learn more.',
        }
      ),
    ],
    [
      'macos_system_ext',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.link.text.macos_system_ext',
        {
          defaultMessage: ' Learn more.',
        }
      ),
    ],
    [
      'linux_deadlock',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.policyResponse.link.text.linux_deadlock',
        {
          defaultMessage: ' troubleshooting docs.',
        }
      ),
    ],
  ])
);

export const LINUX_DEADLOCK_MESSAGE = 'Disabled due to potential system deadlock';
const LINUX_DEADLOCK_ACTION_ERRORS: Set<string> = new Set([
  'load_malware_model',
  'configure_malware',
]);

function isMacosFullDiskAccessError(os: string, policyAction: HostPolicyResponseAppliedAction) {
  return os === 'macos' && policyAction.name === 'full_disk_access';
}

function isMacosSystemExtensionError(os: string, policyAction: HostPolicyResponseAppliedAction) {
  return (
    os === 'macos' &&
    policyAction.name === 'connect_kernel' &&
    policyAction.status === HostPolicyResponseActionStatus.failure
  );
}

function isLinuxDeadlockError(os: string, policyAction: HostPolicyResponseAppliedAction) {
  return (
    os === 'linux' &&
    LINUX_DEADLOCK_ACTION_ERRORS.has(policyAction.name) &&
    policyAction.message === LINUX_DEADLOCK_MESSAGE
  );
}

export class PolicyResponseActionFormatter {
  public key: string;
  public title: string;
  public description: string;
  public hasError: boolean;
  public errorTitle: string;
  public errorDescription?: string;
  public status?: string;
  public linkText?: string;

  constructor(
    private policyResponseAppliedAction: ImmutableObject<HostPolicyResponseAppliedAction>,
    private docLinks: DocLinks['securitySolution']['policyResponseTroubleshooting'],
    private os: string = ''
  ) {
    this.key = policyResponseAppliedAction.name;
    this.title =
      policyResponseTitles.get(this.errorKey || this.key) ??
      this.key.replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase());
    this.hasError =
      policyResponseAppliedAction.status === HostPolicyResponseActionStatus.failure ||
      policyResponseAppliedAction.status === HostPolicyResponseActionStatus.warning;
    this.description = descriptions.get(this.key) || policyResponseAppliedAction.message;
    this.errorDescription =
      descriptions.get(this.errorKey || this.key) || this.policyResponseAppliedAction.message;
    this.errorTitle = this.errorDescription ? this.title : policyResponseAppliedAction.name;
    this.status = policyResponseStatuses.get(policyResponseAppliedAction.status);
    this.linkText = linkTexts.get(this.errorKey || this.key);
  }

  public get linkUrl(): string {
    return this.docLinks[this.errorKey];
  }

  public get isGeneric(): boolean {
    if (
      isMacosFullDiskAccessError(this.os, this.policyResponseAppliedAction) ||
      isMacosSystemExtensionError(this.os, this.policyResponseAppliedAction) ||
      isLinuxDeadlockError(this.os, this.policyResponseAppliedAction)
    ) {
      return true;
    }

    return false;
  }

  private get errorKey(): keyof DocLinks['securitySolution']['policyResponseTroubleshooting'] {
    if (isMacosSystemExtensionError(this.os, this.policyResponseAppliedAction)) {
      return 'macos_system_ext';
    }

    if (isLinuxDeadlockError(this.os, this.policyResponseAppliedAction)) {
      return 'linux_deadlock';
    }

    return this.policyResponseAppliedAction
      .name as keyof DocLinks['securitySolution']['policyResponseTroubleshooting'];
  }
}
