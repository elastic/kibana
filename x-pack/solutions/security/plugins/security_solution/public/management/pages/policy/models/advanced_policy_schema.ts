/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface AdvancedPolicySchemaType {
  key: string;
  first_supported_version: string;
  last_supported_version?: string;
  documentation: string;
  license?: string;
}

export const AdvancedPolicySchema: AdvancedPolicySchemaType[] = [
  {
    key: 'linux.advanced.agent.connection_delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.base_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.base_url',
      {
        defaultMessage:
          'Base URL from which to download global artifact manifests. Default: https://artifacts.security.elastic.co.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
        ignoreTag: true,
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.channel',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.channel',
      {
        defaultMessage:
          'The release channel to use for receiving global artifacts. The "default" is staged roll-out. Set to "rapid" to receive candidate artifacts as soon as available. Set to "stable" to only receive stable artifacts. Default: default',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'linux.advanced.allow_cloud_features',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.allow_cloud_features',
      {
        defaultMessage: `Advanced option to selectively choose which external services are allowed, valid keywords are "sample-collection,reputation-lookup,malware-lookup,artifacts-update,staged-artifacts-rollout". Everything is allowed by default, but if any comma separated value(s) are provided all other features are disabled. To disallow all a special keyword "none" can be used. The option imposes severe limitation on Defend functionality. It's meant only for telemetry extra-avoidant users.`,
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'linux.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'linux.advanced.logging.syslog',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.logging.syslog',
      {
        defaultMessage:
          'A supplied value will configure logging to syslog. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'linux.advanced.tty_io.max_kilobytes_per_process',
    first_supported_version: '8.5',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.tty_io.max_kilobytes_per_process',
      {
        defaultMessage:
          'The maximum kilobytes of terminal output to record for a single process. Default: 512',
      }
    ),
  },
  {
    key: 'linux.advanced.tty_io.max_kilobytes_per_event',
    first_supported_version: '8.5',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.tty_io.max_kilobytes_per_event',
      {
        defaultMessage:
          'The maximum kilobytes of terminal output to record in a single event. Default: 512',
      }
    ),
  },
  {
    key: 'linux.advanced.capture_env_vars',
    first_supported_version: '8.6',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.capture_env_vars',
      {
        defaultMessage:
          'The list of environment variables to capture (up to five), separated by commas.',
      }
    ),
  },
  {
    key: 'linux.advanced.tty_io.max_event_interval_seconds',
    first_supported_version: '8.5',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.tty_io.max_event_interval_seconds',
      {
        defaultMessage:
          'The maximum amount of time (seconds) to batch terminal output in a single event. Default: 30',
      }
    ),
  },
  {
    key: 'linux.advanced.network_events_exclude_local',
    first_supported_version: '8.10.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.network_events_exclude_local',
      {
        defaultMessage: 'Exclude local connections from network events. Default: false.',
      }
    ),
  },
  {
    key: 'mac.advanced.network_events_exclude_local',
    first_supported_version: '8.10.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.network_events_exclude_local',
      {
        defaultMessage: 'Exclude local connections from network events. Default: false.',
      }
    ),
  },
  {
    key: 'linux.advanced.capture_command_line',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.capture_command_line',
      {
        defaultMessage:
          'Include process command line in all events that are related to this process. Default: false.',
      }
    ),
  },
  {
    key: 'mac.advanced.capture_command_line',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.capture_command_line',
      {
        defaultMessage:
          'Include process command line in all events that are related to this process. Default: false.',
      }
    ),
  },
  {
    key: 'mac.advanced.agent.connection_delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.base_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.base_url',
      {
        defaultMessage: 'URL from which to download global artifact manifests.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
        ignoreTag: true,
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.channel',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.channel',
      {
        defaultMessage:
          'The release channel to use for receiving global artifacts. The "default" is staged roll-out. Set to "rapid" to receive candidate artifacts as soon as available. Set to "stable" to only receive stable artifacts. Default: default',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'mac.advanced.allow_cloud_features',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.allow_cloud_features',
      {
        defaultMessage: `Advanced option to selectively choose which external services are allowed, valid keywords are "sample-collection,reputation-lookup,malware-lookup,artifacts-update,staged-artifacts-rollout". Everything is allowed by default, but if any comma separated value(s) are provided all other features are disabled. To disallow all a special keyword "none" can be used. The option imposes severe limitation on Defend functionality. It's meant only for telemetry extra-avoidant users.`,
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'mac.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'mac.advanced.logging.syslog',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.logging.syslog',
      {
        defaultMessage:
          'A supplied value will configure logging to syslog. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'mac.advanced.malware.quarantine',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.malware.threshold',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.malware.threshold',
      {
        defaultMessage:
          'The threshold that should be used for evaluating malware. Allowed values are normal, conservative, and aggressive. Default: normal.',
      }
    ),
  },
  {
    key: 'mac.advanced.malware.max_file_size_bytes',
    first_supported_version: '8.16.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.malware.max_file_size_bytes',
      {
        defaultMessage:
          'The maximum file size in bytes that should be used for evaluating malware. Default: 78643200.',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.connect',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.connect',
      {
        defaultMessage: 'Whether to connect to the kernel driver. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.process',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.process',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.filewrite',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.filewrite',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.harden.self_protect',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.harden.self_protect',
      {
        defaultMessage: 'Enables self-protection on macOS. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.network_events_exclude_local',
    first_supported_version: '8.10.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.network_events_exclude_local',
      {
        defaultMessage: 'Exclude local connections from network events. Default: false.',
      }
    ),
  },
  {
    key: 'windows.advanced.capture_command_line',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.capture_command_line',
      {
        defaultMessage:
          'Include process command line in all events that are related to this process. Default: false.',
      }
    ),
  },
  {
    key: 'windows.advanced.agent.connection_delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.base_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.base_url',
      {
        defaultMessage: 'URL from which to download global artifact manifests.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
        ignoreTag: true,
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.channel',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.channel',
      {
        defaultMessage:
          'The release channel to use for receiving global artifacts. The "default" is staged roll-out. Set to "rapid" to receive candidate artifacts as soon as available. Set to "stable" to only receive stable artifacts. Default: default',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'windows.advanced.allow_cloud_features',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.allow_cloud_features',
      {
        defaultMessage: `Advanced option to selectively choose which external services are allowed, valid keywords are "sample-collection,reputation-lookup,malware-lookup,artifacts-update,staged-artifacts-rollout". Everything is allowed by default, but if any comma separated value(s) are provided all other features are disabled. To disallow all a special keyword "none" can be used. The option imposes severe limitation on Defend functionality. It's meant only for telemetry extra-avoidant users.`,
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'windows.advanced.logging.debugview',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.logging.debugview',
      {
        defaultMessage:
          'A supplied value will configure logging to Debugview (a Sysinternals tool). Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.quarantine',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.threshold',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.threshold',
      {
        defaultMessage:
          'The threshold that should be used for evaluating malware. Allowed values are normal, conservative, and aggressive. Default: normal.',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.max_file_size_bytes',
    first_supported_version: '8.16.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.max_file_size_bytes',
      {
        defaultMessage:
          'The maximum file size in bytes that should be used for evaluating malware. Default: 78643200.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.connect',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.connect',
      {
        defaultMessage: 'Whether to connect to the kernel driver. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.process',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.process',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.filewrite',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.filewrite',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.filewrite_sync',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.filewrite_sync',
      {
        defaultMessage:
          'Send file kernel driver write notifications synchronously where possible.  May improve the reliability of file write and malware-on-write enrichments at the cost of system responsiveness. Default: false.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.network',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.network',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.network_report_loopback',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.network_report_loopback',
      {
        defaultMessage:
          'Controls whether the kernel reports loopback network events. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.fileopen',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.fileopen',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file open events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.asyncimageload',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.asyncimageload',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel async image load events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.syncimageload',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.syncimageload',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel sync image load events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.registry',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.registry',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel registry events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.fileaccess',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.fileaccess',
      {
        defaultMessage:
          'Report limited file access (read) events. Paths are not user-configurable. Default value is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.registryaccess',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.registryaccess',
      {
        defaultMessage:
          'Report limited registry access (queryvalue, savekey) events. Paths are not user-configurable. Default value is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.process_handle',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.process_handle',
      {
        defaultMessage: 'Capture process and thread handle events. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.diagnostic.enabled',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'linux.advanced.diagnostic.enabled',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.diagnostic.enabled',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.cloud_lookup',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.cloud_lookup',
      {
        defaultMessage:
          "A value of 'false' disables cloud lookup for Windows alerts. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.alerts.cloud_lookup',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.alerts.cloud_lookup',
      {
        defaultMessage: "A value of 'false' disables cloud lookup for Mac alerts. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.ransomware.mbr',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.ransomware.mbr',
      {
        defaultMessage: "A value of 'false' disables Ransomware MBR protection. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.ransomware.canary',
    first_supported_version: '7.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.ransomware.canary',
      {
        defaultMessage: "A value of 'false' disables Ransomware canary protection. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode',
      {
        defaultMessage:
          'Enable shellcode injection detection as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.memory_scan',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.malware.quarantine',
    first_supported_version: '7.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.malware.max_file_size_bytes',
    first_supported_version: '8.16.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.malware.max_file_size_bytes',
      {
        defaultMessage:
          'The maximum file size in bytes that should be used for evaluating malware. Default: 78643200.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.enable_fork_scan',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.enable_fork_scan',
      {
        defaultMessage:
          'Enable memory scanning on process fork events. This will have the effect of more memory regions being scanned. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.enable_shared_dirty_scan',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.enable_shared_dirty_scan',
      {
        defaultMessage:
          'Instead of ignoring regions with just no Private_Dirty bytes, ingore regions with the combination of no Private_Dirty bytes, no Shared_Dirty bytes and is file backed. This has the effect of scanning more memory regions because of the loosened restrictions. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_collect_sample',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected shellcode regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_enhanced_pe_parsing',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.memory_protection.shellcode_enhanced_pe_parsing',
      {
        defaultMessage:
          'Attempt to identify and extract PE metadata from injected shellcode, including Authenticode signatures and version resource information. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'mac.advanced.memory_protection.memory_scan',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.memory_scan',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.etw',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.etw',
      {
        defaultMessage: 'Deprecated.',
      }
    ),
  },
  {
    key: 'windows.advanced.diagnostic.rollback_telemetry_enabled',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.diagnostic.rollback_telemetry_enabled',
      {
        defaultMessage: 'Enable diagnostic rollback telemetry. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network_extension.enable_content_filtering',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network_extension.enable_content_filtering',
      {
        defaultMessage:
          'Enable or disable the network content filter, this will enable/disable network eventing. Host isolation will fail if this option is disabled. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network_extension.enable_packet_filtering',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network_extension.enable_packet_filtering',
      {
        defaultMessage:
          'Enable or disable the network packet filter. Host isolation will fail if this option is disabled. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_trampoline_detection',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode_trampoline_detection',
      {
        defaultMessage:
          'Enable trampoline-based shellcode injection detection as a part of memory protection. Default: true',
      }
    ),
  },
  {
    key: 'linux.advanced.kernel.capture_mode',
    first_supported_version: '8.2',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.kernel.capture_mode',
      {
        defaultMessage:
          'Allows users to control whether kprobes or ebpf are used to gather data. Options are kprobe, ebpf, or auto. Auto uses ebpf if possible, otherwise uses kprobe. Default: auto',
      }
    ),
  },
  {
    key: 'linux.advanced.event_filter.default',
    first_supported_version: '8.3',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.event_filter.default',
      {
        defaultMessage: 'Download default event filter rules from Elastic.  Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.event_filter.default',
    first_supported_version: '8.3',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.event_filter.default',
      {
        defaultMessage: 'Download default event filter rules from Elastic.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.event_filter.default',
    first_supported_version: '8.3',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.event_filter.default',
      {
        defaultMessage: 'Download default event filter rules from Elastic.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.utilization_limits.cpu',
    first_supported_version: '8.3',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.utilization_limits.cpu',
      {
        defaultMessage:
          'The percentage of the aggregate system CPU to restrict Endpoint to. The range is 20-100%. Anything under 20 gets ignored and causes a policy warning.  Default: 100',
      }
    ),
  },
  {
    key: 'linux.advanced.utilization_limits.cpu',
    first_supported_version: '8.3',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.utilization_limits.cpu',
      {
        defaultMessage:
          'The percentage of the aggregate system CPU to restrict Endpoint to. The range is 20-100%. Anything under 20 gets ignored and causes a policy warning.  Default: 50',
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.rollback.self_healing.enabled',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.rollback.self_healing.enabled',
      {
        defaultMessage:
          'Self-healing erases attack artifacts when prevention alerts are triggered. Warning: data loss can occur. Default: false',
      }
    ),
    license: 'platinum',
  },
  {
    key: 'linux.advanced.fanotify.ignore_unknown_filesystems',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.fanotify.ignore_unknown_filesystems',
      {
        defaultMessage:
          'Whether fanotify should ignore unknown filesystems. When true, only CI tested filesystems will be marked by default; additional filesystems can be added or removed with "monitored_filesystems" and "ignored_filesystems", respectively. When false, only an internally curated list of filesystems will be ignored, all others will be marked; additional filesystems can be ignored via "ignored_filesystems". "monitored_filesystems" is ignored when "ignore_unknown_filesystems" is false. Default: true',
      }
    ),
  },
  {
    key: 'linux.advanced.fanotify.monitored_filesystems',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.fanotify.monitored_filesystems',
      {
        defaultMessage:
          'Additional filesystems for fanotify to monitor. The format is a comma separated list of filesystem names as they appear in "/proc/filesystems", e.g. "jfs,ufs,ramfs". It is recommended to avoid network-backed filesystems. When "ignore_unknown_filesystems" is false, this option is ignored. When "ignore_unknown_filesystems" is true, parsed entries of this option are monitored by fanotify unless overridden by entries in "ignored_filesystems" or internally known bad filesystems.',
      }
    ),
  },
  {
    key: 'linux.advanced.fanotify.ignored_filesystems',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.fanotify.ignored_filesystems',
      {
        defaultMessage:
          'Additional filesystems for fanotify to ignore. The format is a comma separated list of filesystem names as they appear in "/proc/filesystems", e.g. "ext4,tmpfs". When "ignore_unknown_filesystems" is false, parsed entries of this option supplement internally known bad filesystems to be ignored. When "ignore_unknown_filesystems" is true, parsed entries of this option override entries in "monitored_filesystems" and internally CI tested filesystems.',
      }
    ),
  },
  {
    key: 'linux.advanced.fanotify.seccomp_restricted',
    first_supported_version: '8.13.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.fanotify.seccomp_restricted',
      {
        defaultMessage:
          'Prevent the Defend permission checking thread from calling the open/openat syscalls when running on kernels which require FAN_OPEN_PERM (older than 5.0). Will avoid potential deadlocks with other anti-virus vendors at the cost of racy hash-based trusted application entries. Ignored when running on newer kernels. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.context_manipulation_detection',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.context_manipulation_detection',
      {
        defaultMessage:
          'Detect injection based on thread context manipulation (e.g. `SetThreadContext`) as a part of memory protection. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.image_and_process_file_timestamp',
    first_supported_version: '8.4',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.image_and_process_file_timestamp',
      {
        defaultMessage:
          'Collect executable/dll timestamps for process and async image load events. Default: true',
      }
    ),
  },
  {
    key: 'linux.advanced.host_isolation.allowed',
    first_supported_version: '8.6.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.host_isolation.allowed',
      {
        defaultMessage:
          'A value of false disallows host isolation activity on Linux endpoints, regardless of whether host isolation is supported. Note that if a host is currently not isolated, it will refuse to isolate, and likewise, a host will refuse to release if it is currently isolated. A value of true will allow Linux endpoints to isolate if supported. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.capture_env_vars',
    first_supported_version: '8.7',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.capture_env_vars',
      {
        defaultMessage:
          'The list of environment variables to capture (up to five), separated by commas.',
      }
    ),
  },
  {
    key: 'linux.advanced.events.disable_fd_kprobes',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.disable_fd_kprobes',
      {
        defaultMessage:
          'When only process events are being collected, this option will disable file descriptor tracking probes. This can be used to reduce Endpoint processing at the expense of missing fchdir based working directory changes. This only applies if the capture_mode is kprobe or if auto resolves tracefs (kprobe) probes. ebpf based event collection ignores this setting. Default is false.',
      }
    ),
  },
  {
    key: 'linux.advanced.events.enable_caps',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.enable_caps',
      {
        defaultMessage:
          'This setting ensures thread capability arrays are not pruned from Linux process events before being sent to Elasticsearch. At the expense of higher Endpoint data volumes, a true value will ensure capability matching detection rules running within the Elastic stack can match. Detection rules running within Elastic Defend are unaffected because capabilities are conditionally pruned after rule processing. Default is false.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.emit_in_events',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.emit_in_events',
      {
        defaultMessage:
          'If set, callstacks will be included in regular events where they are collected. Otherwise, they are only included in events that trigger behavioral protection rules. Note that setting this may significantly increase data volumes. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.process',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.process',
      {
        defaultMessage: 'Collect callstacks during process events?  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.image_load',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.image_load',
      {
        defaultMessage: 'Collect callstacks during image/library load events?  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.file',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.file',
      {
        defaultMessage: 'Collect callstacks during file events?  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.registry',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.registry',
      {
        defaultMessage: 'Collect callstacks during registry events?  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.timeout_microseconds',
    first_supported_version: '8.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.timeout_microseconds',
      {
        defaultMessage:
          'Maximum runtime of inline callstack collection/enrichment.  Default: 100000',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.use_hardware',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.use_hardware',
      {
        defaultMessage:
          'Use hardware callstacks (e.g. Intel CET) if supported by the OS and CPU.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.exclude_hotpatch_extension_pages',
    first_supported_version: '8.15.2',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.exclude_hotpatch_extension_pages',
      {
        defaultMessage:
          'Exclude Windows 11 24H2 hotpatch extension pages, which resemble injected code, from callstack module stomp scanning.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.process_ancestry_length',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.process_ancestry_length',
      {
        defaultMessage:
          'Maximum number of process ancestry entries to include in process events. Default: 5',
      }
    ),
  },
  {
    key: 'mac.advanced.events.process_ancestry_length',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.process_ancestry_length',
      {
        defaultMessage:
          'Maximum number of process ancestry entries to include in process events. Default: 5',
      }
    ),
  },
  {
    key: 'linux.advanced.events.process_ancestry_length',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.process_ancestry_length',
      {
        defaultMessage:
          'Maximum number of process ancestry entries to include in process events. Default: 5',
      }
    ),
  },
  {
    key: 'windows.advanced.events.ancestry_in_all_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.ancestry_in_all_events',
      {
        defaultMessage:
          'Include ancestor process entity IDs in all event types, by default it is only included in alerts and process events. Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.events.ancestry_in_all_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.ancestry_in_all_events',
      {
        defaultMessage:
          'Include ancestor process entity IDs in all event types, by default it is only included in alerts and process events. Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.events.ancestry_in_all_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.ancestry_in_all_events',
      {
        defaultMessage:
          'Include ancestor process entity IDs in all event types, by default it is only included in alerts and process events. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading global artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading global artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading user artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading user artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading global artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading global artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading user artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading user artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading global artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading global artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.proxy_url',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.proxy_url',
      {
        defaultMessage:
          'Proxy server to use when downloading user artifact manifests. Default: none',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.proxy_disable',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.proxy_disable',
      {
        defaultMessage:
          'If the proxy setting should be used when downloading user artifact manifests. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.api',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.api',
      {
        defaultMessage:
          'Controls whether ETW API events are enabled. Set to false to disable ETW event collection. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.api_disabled',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.api_disabled',
      {
        defaultMessage: 'A comma separated list of API names to selectively disable.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.api_verbose',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.api_verbose',
      {
        defaultMessage:
          'Controls whether high volume API events are forwarded. Event filtering is recommended if enabled. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.rollback.self_healing.registry_enabled',
    first_supported_version: '8.8',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.rollback.self_healing.registry_enabled',
      {
        defaultMessage:
          'Enables self-healing of registry based malware artifacts. Requires rollback.self_healing.enabled to also be enabled. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.callstacks.include_network_images',
    first_supported_version: '8.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.callstacks.include_network_images',
      {
        defaultMessage:
          'Should executables and DLLs on network shares be parsed for call stack symbols?  This may cause Endpoint to hang on some networks. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.ppl.harden_images',
    first_supported_version: '8.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.ppl.harden_images',
      {
        defaultMessage:
          'Mitigate attacks like PPLFault by preventing Protected Process Light (PPL) processes from loading DLLs over the network. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.ppl.harden_am_images',
    first_supported_version: '8.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.ppl.harden_am_images',
      {
        defaultMessage:
          'Apply the windows.advanced.kernel.ppl.harden_images mitigation to Anti-Malware PPL as well. Disable this if third-party Anti-Malware is blocked from loading DLLs over the network. If this happens, there will be Event ID 8 events in the "Microsoft-Windows-Security-Mitigations/Kernel Mode" event log. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.dev_drives.harden',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.dev_drives.harden',
      {
        defaultMessage:
          'Controls whether malware protection is applied to dev drives. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.networkshare',
    first_supported_version: '8.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.networkshare',
      {
        defaultMessage:
          'Controls whether malware protection is applied to network drives. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.check_debug_registers',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.check_debug_registers',
      {
        defaultMessage:
          'Check debug registers inline to detect the use of hardware breakpoints. Malware may use hardware breakpoints to forge benign-looking call stacks. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.fileaccess',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.fileaccess',
      {
        defaultMessage:
          'A value of false overrides other config settings that would enable kernel fileaccess events. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.events.image_load',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.image_load',
      {
        defaultMessage:
          'A value of false overrides other config settings that would enable kernel image load events. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.image_load.capture',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.image_load.collect',
      {
        defaultMessage:
          'Collect and send image load events to Elasticsearch. Take caution, this can be a very high data volume. Adding an event filter to drop unwanted events is strongly recommended. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.document_enrichment.fields',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.document_enrichment.fields',
      {
        defaultMessage:
          'A comma delimited set of key=value pairs of values to add into all Endpoint documents. Each key must begin with Custom. An example is Custom.key=value1,Custom.key2=value2',
      }
    ),
  },
  {
    key: 'mac.advanced.document_enrichment.fields',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.document_enrichment.fields',
      {
        defaultMessage:
          'A comma delimited set of key=value pairs of values to add into all Endpoint documents. Each key must begin with Custom. An example is Custom.key=value1,Custom.key2=value2',
      }
    ),
  },
  {
    key: 'linux.advanced.document_enrichment.fields',
    first_supported_version: '8.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.document_enrichment.fields',
      {
        defaultMessage:
          'A comma delimited set of key=value pairs of values to add into all Endpoint documents. Each key must begin with Custom. An example is Custom.key=value1,Custom.key2=value2',
      }
    ),
  },
  {
    key: 'linux.advanced.file_cache.file_object_cache_size',
    first_supported_version: '8.12.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.file_cache.file_object_cache_size',
      {
        defaultMessage:
          'Maximum size of the file cache.  Larger values can improve performance but increase memory usage. Default: 250',
      }
    ),
  },
  {
    key: 'mac.advanced.file_cache.file_object_cache_size',
    first_supported_version: '8.12.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.file_cache.file_object_cache_size',
      {
        defaultMessage:
          'Maximum size of the file cache.  Larger values can improve performance but increase memory usage. Default: 250',
      }
    ),
  },
  {
    key: 'windows.advanced.file_cache.file_object_cache_size',
    first_supported_version: '8.12.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.file_cache.file_object_cache_size',
      {
        defaultMessage:
          'Maximum size of the file cache.  Larger values can improve performance but increase memory usage. Default: 250',
      }
    ),
  },
  {
    key: 'windows.advanced.utilization_limits.resident_memory_target_mb',
    first_supported_version: '8.12.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.utilization_limits.resident_memory_target_mb',
      {
        defaultMessage:
          'How much memory (in MB) should Endpoint aim to keep resident in RAM? This setting affects Private Working Set on Windows. It does not affect the amount of virtual memory that Endpoint requests from the OS (Private Bytes aka Commit Charge). If plenty of unused RAM is available, Windows may give Endpoint more RAM than requested to reduce unnecessary paging and improve performance. If the current Defend configuration requires regularly touching more than the requested amount of memory, then the Private Working Set will be higher than requested here. Default 200. This value cannot be decreased below 50.',
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.sample_collection',
    first_supported_version: '8.13',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.sample_collection',
      {
        defaultMessage:
          "A value of 'false' disables malicious sample collection for Windows alerts. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.alerts.sample_collection',
    first_supported_version: '8.13',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.alerts.sample_collection',
      {
        defaultMessage:
          "A value of 'false' disables malicious sample collection for Mac alerts. Default: true.",
      }
    ),
  },
  {
    key: 'linux.advanced.alerts.sample_collection',
    first_supported_version: '8.13',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.alerts.sample_collection',
      {
        defaultMessage:
          "A value of 'false' disables malicious sample collection for Linux alerts. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.events.disable_image_load_suppression_cache',
    first_supported_version: '8.12.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.disable_image_load_suppression_cache',
      {
        defaultMessage:
          'The image load suppression cache improves system performance by enabling Endpoint to tell its kernel driver about DLLs which are un-interesting and will never be evented upon. This feature improves system reponsiveness and reduces Endpoint CPU usage.  Use this setting only for troubleshooting if image load events are not being generated as expected. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.disable_registry_write_suppression',
    first_supported_version: '8.12.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.disable_registry_write_suppression',
      {
        defaultMessage:
          'Registry write suppression improves system performance by enabling Endpoint to tell its driver that certain types of registry operations are uninteresting. Once deemed uninteresting, the driver can quickly drop these events, improving system responsiveness and reducing Endpoint CPU usage. Use this setting only for troubleshooting if registry events are not functioning as expected. Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.process.creation_flags',
    first_supported_version: '8.13.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.process.creation_flags',
      {
        defaultMessage:
          'Enables an additional enrichment for process events. Use this setting only for troubleshooting if process events are not functioning as expected. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.memory_scan',
    first_supported_version: '8.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.memory_scan',
      {
        defaultMessage:
          'On behavior alerts, this feature enables an additional scan of identified memory regions against well-known malware signatures. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.flags',
    first_supported_version: '8.13.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.flags',
      {
        defaultMessage:
          'A comma-separated list of feature flags. Currently no feature flags are supported.',
      }
    ),
  },
  {
    key: 'mac.advanced.flags',
    first_supported_version: '8.16.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.flags',
      {
        defaultMessage:
          'A comma-separated list of feature flags. Currently no feature flags are supported.',
      }
    ),
  },
  {
    key: 'linux.advanced.flags',
    first_supported_version: '8.16.0',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.flags',
      {
        defaultMessage:
          'A comma-separated list of feature flags. Currently no feature flags are supported.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.ca_cert',
      {
        defaultMessage:
          'PEM-encoded certificate for security artifacts server certificate authority.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.ca_cert',
      {
        defaultMessage:
          'PEM-encoded certificate for security artifacts server certificate authority.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.ca_cert',
      {
        defaultMessage:
          'PEM-encoded certificate for security artifacts server certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.event_on_access.file_paths',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.event_on_access.file_paths',
      {
        defaultMessage:
          'Comma-separated list of additional wildcard patterns that will be monitored for read access. Endpoint will report at most one match per pattern per process. Endpoint will attempt to convert drive letters to NT paths (e.g. \\\\Device\\\\HarddiskVolume4), but conversion will fail for per-user drives such as network drives. Put only commas (no spaces) between entries. Wildcard matching is case-insensitive. See Microsoft FsRtlIsNameInExpression documentation for wildcard matching rules.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.event_on_access.registry_paths',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.event_on_access.registry_paths',
      {
        defaultMessage:
          'Comma-separated list of registry paths that will be monitored for read access. These must be NT paths (e.g. \\\\REGISTRY\\\\MACHINE\\\\SOFTWARE\\\\Microsoft\\\\...). Endpoint will report at most one match per pattern per process. Put only commas (no spaces) between entries. Wildcard matching is case-insensitive. See Microsoft FsRtlIsNameInExpression documentation for wildcard matching rules.',
      }
    ),
  },
  {
    key: 'mac.advanced.events.event_on_access.file_paths',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.event_on_access.file_paths',
      {
        defaultMessage:
          'Comma-separated list of additional wildcard patterns that will be monitored for read access.  Put only commas (no spaces) between entries. Wildcard matching is case-insensitive.',
      }
    ),
  },
  {
    key: 'mac.advanced.events.deduplicate_network_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.deduplicate_network_events',
      {
        defaultMessage: "A value of 'false' disables network events deduplication. Default: true",
      }
    ),
  },
  {
    key: 'windows.advanced.events.deduplicate_network_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.deduplicate_network_events',
      {
        defaultMessage: "A value of 'false' disables network events deduplication. Default: true",
      }
    ),
  },
  {
    key: 'linux.advanced.events.deduplicate_network_events',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.deduplicate_network_events',
      {
        defaultMessage: "A value of 'false' disables network events deduplication. Default: true",
      }
    ),
  },
  {
    key: 'mac.advanced.events.deduplicate_network_events_below_bytes',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.deduplicate_network_events_below_bytes',
      {
        defaultMessage:
          "Deduplication transfer threshold in bytes. Events exceeding the transfer will not be deduplicated. A value '0' means disabled. Default: 1048576 (1MB)",
      }
    ),
  },
  {
    key: 'windows.advanced.events.deduplicate_network_events_below_bytes',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.deduplicate_network_events_below_bytes',
      {
        defaultMessage:
          "Deduplication transfer threshold in bytes. Events exceeding the transfer will not be deduplicated. A value '0' means disabled. Default: 1048576 (1MB)",
      }
    ),
  },
  {
    key: 'linux.advanced.events.deduplicate_network_events_below_bytes',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.deduplicate_network_events_below_bytes',
      {
        defaultMessage:
          "Deduplication transfer threshold in bytes. Events exceeding the transfer will not be deduplicated. A value '0' means disabled. Default: 1048576 (1MB)",
      }
    ),
  },
  {
    key: 'windows.advanced.events.registry.enforce_registry_filters',
    first_supported_version: '8.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.registry.enforce_registry_filters',
      {
        defaultMessage:
          'Reduce data volume by filtering out registry events which are not relevant to behavioral protections.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.events.file.max_hash_size_mb',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.file.max_hash_size_mb',
      {
        defaultMessage:
          "Attempt to include file.hash.sha256 in file events.  Hashing is asynchronous, best-effort, and is not guaranteed to succeed, especially on network drives.  WARNING: File hashing is a very CPU- and I/O-intensive process.  WARNING: This feature will increase Endpoint's CPU and I/O, and may adversely affect system responsiveness, especially during I/O-intensive activity such as directory copies and compilation.  WARNING: Event processing will be delayed due to the time spent hashing, causing Endpoint's Behavioral and Ransomware protections to fire later than normal, potentially allowing threats to inflect additional damage.  Set to 'off' to disable this feature.  Set to '0' to hash all files up to 1 GiB.  Otherwise, this sets the maximum to-be-hashed file size in MiB.  Default: off",
      }
    ),
  },
  {
    key: 'linux.advanced.events.file.max_hash_size_mb',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.file.max_hash_size_mb',
      {
        defaultMessage:
          "Attempt to include file.hash.sha256 in file events.  Hashing is asynchronous, best-effort, and is not guaranteed to succeed, especially on network drives.  WARNING: File hashing is a very CPU- and I/O-intensive process.  WARNING: This feature will increase Endpoint's CPU and I/O, and may adversely affect system responsiveness, especially during I/O-intensive activity such as directory copies and compilation.  WARNING: Event processing will be delayed due to the time spent hashing, causing Endpoint's Behavioral and Ransomware protections to fire later than normal, potentially allowing threats to inflect additional damage.  Set to 'off' to disable this feature.  Set to '0' to hash all files up to 1 GiB.  Otherwise, this sets the maximum to-be-hashed file size in MiB.  Default: off",
      }
    ),
  },
  {
    key: 'mac.advanced.events.file.max_hash_size_mb',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.file.max_hash_size_mb',
      {
        defaultMessage:
          "Attempt to include file.hash.sha256 in file events.  Hashing is asynchronous, best-effort, and is not guaranteed to succeed, especially on network drives.  WARNING: File hashing is a very CPU- and I/O-intensive process.  WARNING: This feature will increase Endpoint's CPU and I/O, and may adversely affect system responsiveness, especially during I/O-intensive activity such as directory copies and compilation.  WARNING: Event processing will be delayed due to the time spent hashing, causing Endpoint's Behavioral and Ransomware protections to fire later than normal, potentially allowing threats to inflect additional damage.  Set to 'off' to disable this feature.  Set to '0' to hash all files up to 1 GiB.  Otherwise, this sets the maximum to-be-hashed file size in MiB.  Default: off",
      }
    ),
  },
  {
    key: 'windows.advanced.events.aggregate_process',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.aggregate_process',
      {
        defaultMessage:
          'Reduce event volume by merging related process events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'linux.advanced.events.aggregate_process',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.aggregate_process',
      {
        defaultMessage:
          'Reduce event volume by merging related process events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'mac.advanced.events.aggregate_process',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.aggregate_process',
      {
        defaultMessage:
          'Reduce event volume by merging related process events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.aggregate_network',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.aggregate_network',
      {
        defaultMessage:
          'Reduce event volume by merging related network events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'linux.advanced.events.aggregate_network',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.aggregate_network',
      {
        defaultMessage:
          'Reduce event volume by merging related network events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'mac.advanced.events.aggregate_network',
    first_supported_version: '8.18',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.aggregate_network',
      {
        defaultMessage:
          'Reduce event volume by merging related network events into fewer aggregate events. Default is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'windows.advanced.events.hash.sha256',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.hash.sha256',
      {
        defaultMessage:
          'Compute and include SHA-256 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: true',
      }
    ),
  },
  {
    key: 'linux.advanced.alerts.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.alerts.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.alerts.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.alerts.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.events.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.events.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.events.hash.sha256',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.events.hash.sha256',
      {
        defaultMessage:
          'Compute and include SHA-256 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.alerts.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.alerts.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.alerts.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.alerts.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes in alerts?  This will increase CPU usage and alert sizes.  If any user exceptionlist, trustlist, or blocklists reference this hash type, Endpoint will ignore this setting and automatically enable this hash type.  Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.events.hash.md5',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.hash.md5',
      {
        defaultMessage:
          'Compute and include MD5 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.events.hash.sha1',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.hash.sha1',
      {
        defaultMessage:
          'Compute and include SHA-1 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.events.hash.sha256',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.events.hash.sha256',
      {
        defaultMessage:
          'Compute and include SHA-256 hashes for processes and libraries in events?  This will increase CPU usage and event sizes.  Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.set_extended_host_information',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.set_extended_host_information',
      {
        defaultMessage:
          'Include more details about hosts in events? Set to false to receive only id, name and os. Setting to true will increase event size.  Default: false',
      }
    ),
  },
  {
    key: 'mac.advanced.set_extended_host_information',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.set_extended_host_information',
      {
        defaultMessage:
          'Include more details about hosts in events? Set to false to receive only id, name and os. Setting to true will increase event size.  Default: false',
      }
    ),
  },
  {
    key: 'linux.advanced.set_extended_host_information',
    first_supported_version: '8.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.set_extended_host_information',
      {
        defaultMessage:
          'Include more details about hosts in events? Set to false to receive only id, name and os. Setting to true will increase event size.  Default: false',
      }
    ),
  },
];
