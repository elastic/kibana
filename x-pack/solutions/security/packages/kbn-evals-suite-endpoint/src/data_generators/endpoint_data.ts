/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
} from '@kbn/security-solution-plugin/common/endpoint/constants';

const POLL_INTERVAL_MS = 5_000;

const EVAL_AGENT_ID_PREFIX = 'eval-agent-';
const EVAL_SEEDED_QUERY = { prefix: { 'agent.id': EVAL_AGENT_ID_PREFIX } };

export async function waitForEndpointPackage(
  kbnClient: KbnClient,
  esClient: Client,
  log: ToolingLog,
  maxWaitMs = 120_000
): Promise<void> {
  const start = Date.now();
  log.info('Waiting for endpoint package to be installed...');

  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await kbnClient.request<{ item: { status: string } }>({
        method: 'GET',
        path: '/api/fleet/epm/packages/endpoint',
      });

      if (response.data.item.status === 'installed') {
        log.info('Endpoint package is installed. Verifying transforms are started...');

        const statsResponse = await esClient.transform.getTransformStats({
          transform_id: 'endpoint*',
        });

        const stoppedTransforms = statsResponse.transforms.filter((t) => t.state === 'stopped');

        for (const t of stoppedTransforms) {
          log.info(`Restarting stopped transform: ${t.id}`);
          try {
            await esClient.transform.startTransform({ transform_id: t.id });
          } catch (e) {
            log.debug(`Failed to restart transform ${t.id}: ${e}`);
          }
        }

        const hasCurrentTransform = statsResponse.transforms.some((t) =>
          t.id.startsWith(metadataTransformPrefix)
        );
        const hasUnitedTransform = statsResponse.transforms.some((t) =>
          t.id.startsWith(METADATA_UNITED_TRANSFORM)
        );
        const allStarted =
          statsResponse.transforms.length > 0 &&
          statsResponse.transforms.every((t) => t.state === 'started' || t.state === 'indexing');

        if (hasCurrentTransform && hasUnitedTransform && allStarted) {
          log.info(
            `All endpoint transforms are running (${statsResponse.transforms.length} total)`
          );
          return;
        }

        log.debug(
          `Waiting for endpoint transforms (current=${hasCurrentTransform}, united=${hasUnitedTransform}): ${statsResponse.transforms
            .map((t) => `${t.id}=${t.state}`)
            .join(', ')}`
        );
      } else {
        log.debug(`Endpoint package status: ${response.data.item.status}`);
      }
    } catch (err) {
      log.debug(`Error checking endpoint package: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for endpoint package to be installed after ${maxWaitMs}ms`);
}

export async function waitForTransformPropagation(
  esClient: Client,
  log: ToolingLog,
  expectedCounts: { metadataCurrent: number; metadataUnited: number },
  maxWaitMs = 180_000
): Promise<void> {
  const start = Date.now();
  let lastCounts = { metadataCurrent: 0, metadataUnited: 0 };
  log.info(
    `Waiting for transform propagation: metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}`
  );

  while (Date.now() - start < maxWaitMs) {
    try {
      const [currentCount, unitedCount] = await Promise.all([
        esClient.count({
          index: metadataCurrentIndexPattern,
          query: EVAL_SEEDED_QUERY,
          ignore_unavailable: true,
        }),
        esClient.count({
          index: METADATA_UNITED_INDEX,
          query: EVAL_SEEDED_QUERY,
          ignore_unavailable: true,
        }),
      ]);
      lastCounts = {
        metadataCurrent: currentCount.count,
        metadataUnited: unitedCount.count,
      };

      log.debug(
        `Transform propagation: metadataCurrent=${currentCount.count}/${expectedCounts.metadataCurrent}, metadataUnited=${unitedCount.count}/${expectedCounts.metadataUnited}`
      );

      if (
        currentCount.count >= expectedCounts.metadataCurrent &&
        unitedCount.count >= expectedCounts.metadataUnited
      ) {
        log.info('Transform propagation complete');
        return;
      }
    } catch (err) {
      log.debug(`Error checking transform propagation: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for transform propagation after ${maxWaitMs}ms. ` +
      `Expected metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}; ` +
      `last observed metadataCurrent=${lastCounts.metadataCurrent}, metadataUnited=${lastCounts.metadataUnited}`
  );
}

export interface SeedClients {
  esClient: Client;
  internalEsClient: Client;
}

interface ExtraDocument {
  index: string;
  document: Record<string, unknown>;
}

interface EndpointScenario {
  agentId: string;
  hostName: string;
  os: {
    name: string;
    version: string;
    type?: string;
    platform?: string;
    family?: string;
    full?: string;
  };
  policyName: string;
  policyStatus: string;
  policyId?: string;
  endpointStatus?: string;
  agentVersion?: string;
  extraDocuments?: ExtraDocument[];
}

const DEFAULT_POLICY_NAME = 'manual eval policy';
const DEFAULT_AGENT_VERSION = '9.5.0-SNAPSHOT';

const createPolicyResponseDocument = ({
  agentId,
  hostName,
  os,
  policyId,
  policyName = DEFAULT_POLICY_NAME,
  policyStatus = 'success',
  endpointStatus = 'enrolled',
  agentVersion = DEFAULT_AGENT_VERSION,
  message = 'agent_connectivity: Successfully connected to Agent; workflow: Successfully executed all workflows',
  scenario,
}: Pick<EndpointScenario, 'agentId' | 'hostName' | 'os'> & {
  policyId: string;
  policyName?: string;
  policyStatus?: string;
  endpointStatus?: string;
  agentVersion?: string;
  message?: string;
  scenario: string;
}): ExtraDocument => ({
  index: 'metrics-endpoint.policy-default',
  document: {
    event: {
      kind: 'metric',
      category: ['configuration'],
      type: ['info'],
      dataset: 'endpoint.policy',
      module: 'endpoint',
    },
    data_stream: {
      type: 'metrics',
      dataset: 'endpoint.policy',
      namespace: 'default',
    },
    agent: {
      id: agentId,
      type: 'endpoint',
      version: agentVersion,
      build: {
        original: `version: ${agentVersion}, compiled: Wed Jun 3 02:00:00 2026, branch: HEAD, commit: manualeval`,
      },
    },
    elastic: { agent: { id: agentId } },
    host: {
      name: hostName,
      hostname: hostName,
      os,
    },
    Endpoint: {
      status: endpointStatus,
      policy: {
        applied: {
          id: policyId,
          name: policyName,
          endpoint_policy_version: '1',
          status: policyStatus,
          actions: [
            {
              name: 'agent_connectivity',
              status: 'success',
              message: 'Successfully connected to Agent',
            },
            {
              name: 'workflow',
              status: 'success',
              message: 'Successfully executed all workflows',
            },
          ],
          response: {
            configurations: {
              manual_eval: {
                status: policyStatus,
                concerned_actions: ['agent_connectivity', 'workflow'],
              },
            },
          },
        },
      },
    },
    message,
    labels: { manual_eval_scenario: scenario },
  },
});

const createEndpointSecurityLogDocument = ({
  agentId,
  hostName,
  message,
}: {
  agentId: string;
  hostName: string;
  message: string;
}): ExtraDocument => ({
  index: 'logs-elastic_agent.endpoint_security-default',
  document: {
    agent: { id: agentId },
    elastic: { agent: { id: agentId } },
    host: { name: hostName, hostname: hostName },
    event: { dataset: 'elastic_agent.endpoint_security' },
    message,
  },
});

export async function seedScenario(clients: SeedClients, scenario: EndpointScenario) {
  const now = new Date().toISOString();
  const {
    agentId,
    hostName,
    os,
    policyName,
    policyStatus,
    policyId,
    endpointStatus = 'enrolled',
    agentVersion = DEFAULT_AGENT_VERSION,
    extraDocuments = [],
  } = scenario;

  await clients.esClient.create({
    index: 'metrics-endpoint.metadata-default',
    id: `eval-metadata-${hostName}-${Date.now()}`,
    refresh: true,
    document: {
      '@timestamp': now,
      event: {
        kind: 'metric',
        dataset: 'endpoint.metadata',
        module: 'endpoint',
      },
      data_stream: {
        type: 'metrics',
        dataset: 'endpoint.metadata',
        namespace: 'default',
      },
      agent: { id: agentId, type: 'endpoint', version: agentVersion },
      host: { name: hostName, hostname: hostName, os },
      Endpoint: {
        status: endpointStatus,
        policy: { applied: { status: policyStatus, name: policyName, id: policyId } },
      },
      elastic: { agent: { id: agentId } },
      labels: { manual_eval_host: hostName },
    },
  });

  const agentStatus =
    endpointStatus === 'failed' ? 'error' : endpointStatus === 'degraded' ? 'degraded' : 'online';

  await clients.internalEsClient.index({
    index: '.fleet-agents',
    id: agentId,
    refresh: true,
    document: {
      '@timestamp': now,
      agent: { id: agentId, version: agentVersion },
      local_metadata: { host: { name: hostName } },
      active: true,
      enrolled_at: now,
      last_checkin: now,
      status: agentStatus,
      last_known_status: agentStatus,
      last_checkin_status: agentStatus,
      policy_revision_idx: 1,
      policy_id: policyId,
    },
  });

  let documentCounter = 0;
  for (const extra of extraDocuments) {
    await clients.esClient.create({
      index: extra.index,
      id: `eval-${hostName}-${Date.now()}-${documentCounter++}`,
      refresh: true,
      document: { '@timestamp': now, ...extra.document },
    });
  }
}

export const SCENARIOS = {
  incompatibleAntivirus: {
    agentId: 'eval-agent-av-001',
    hostName: 'eval-host-av',
    os: { name: 'Windows', version: '10', type: 'windows', full: 'Windows 10' },
    policyName: 'eval-policy-av',
    policyStatus: 'success',
    extraDocuments: [
      { name: 'MsMpEng.exe', description: 'Windows Defender' },
      { name: 'avp.exe', description: 'Kaspersky Antivirus' },
      { name: 'CSFalconService.exe', description: 'CrowdStrike Falcon' },
      { name: 'SentinelAgent.exe', description: 'SentinelOne' },
    ].map((proc, i) => ({
      index: 'logs-endpoint.events.process-default',
      document: {
        agent: { id: 'eval-agent-av-001' },
        host: { name: 'eval-host-av' },
        event: { type: 'start', category: 'process' },
        process: { name: proc.name, pid: 1000 + i, executable: `C:\\Program Files\\${proc.name}` },
        message: `Antivirus process detected: ${proc.description} (${proc.name})`,
      },
    })),
  },

  policyResponseFailure: {
    agentId: 'eval-agent-policy-001',
    hostName: 'eval-host-policy',
    os: { name: 'Linux', version: 'Ubuntu 22.04', type: 'linux', full: 'Ubuntu 22.04' },
    policyName: 'eval-policy-strict',
    policyStatus: 'failure',
    endpointStatus: 'degraded',
    extraDocuments: [
      {
        index: 'metrics-endpoint.policy-default',
        document: {
          agent: { id: 'eval-agent-policy-001' },
          host: { name: 'eval-host-policy' },
          Endpoint: {
            policy: {
              applied: {
                status: 'failure',
                name: 'eval-policy-strict',
                id: 'eval-policy-id-001',
                version: 3,
                endpoint_policy_version: 2,
                response: {
                  configurations: {
                    malware: { status: 'failure', concerned_actions: ['enable_kernel_extension'] },
                  },
                },
              },
            },
          },
          event: { type: 'state', category: 'host' },
          message: 'Endpoint policy application failed: kernel extension could not be loaded',
        },
      },
    ],
  },

  stoppedUnitedTransform: {
    agentId: 'eval-agent-transform-001',
    hostName: 'eval-host-transform',
    os: { name: 'Windows', version: '11', type: 'windows', full: 'Windows 11' },
    policyName: 'eval-policy-transform',
    policyStatus: 'success',
  },

  currentlyHealthyEndpoint: {
    agentId: 'eval-agent-currently-healthy-001',
    hostName: 'eval-currently-healthy-endpoint',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-currently-healthy',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-currently-healthy-001',
        hostName: 'eval-currently-healthy-endpoint',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-currently-healthy',
        scenario: 'currently_healthy_endpoint',
      }),
    ],
  },

  missingEndpointAlertsOutputShippingFailure: {
    agentId: 'eval-agent-output-shipping-001',
    hostName: 'eval-endpoint-alerts-missing-output-s',
    os: {
      name: 'Linux',
      version: '26.04',
      type: 'linux',
      platform: 'ubuntu',
      full: 'Ubuntu 26.04',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-output-shipping',
    endpointStatus: 'degraded',
    extraDocuments: [
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-output-shipping-001',
        hostName: 'eval-endpoint-alerts-missing-output-s',
        message:
          'Endpoint is setting status to DEGRADED, reason: Unable to connect to output server. SSL handshake with Logstash server at logstash.example:5044 encountered an error. Logstash connection is down; alert and event documents are not reaching Elasticsearch.',
      }),
      createPolicyResponseDocument({
        agentId: 'eval-agent-output-shipping-001',
        hostName: 'eval-endpoint-alerts-missing-output-s',
        os: {
          name: 'Linux',
          version: '26.04',
          type: 'linux',
          platform: 'ubuntu',
          full: 'Ubuntu 26.04',
        },
        policyId: 'eval-policy-output-shipping',
        endpointStatus: 'degraded',
        scenario: 'endpoint_alerts_missing_output_shipping_failure_explicit_prompt',
      }),
    ],
  },

  endpointExceptionFieldMismatch: {
    agentId: 'eval-agent-exception-field-001',
    hostName: 'eval-endpoint-exception-field-mismatc',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-exception-field',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-exception-field-001',
        hostName: 'eval-endpoint-exception-field-mismatc',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-exception-field',
        scenario: 'endpoint_exception_field_mismatch_explicit_prompt',
      }),
      {
        index: 'logs-endpoint.alerts-default',
        document: {
          agent: { id: 'eval-agent-exception-field-001' },
          elastic: { agent: { id: 'eval-agent-exception-field-001' } },
          host: {
            name: 'eval-endpoint-exception-field-mismatc',
            hostname: 'eval-endpoint-exception-field-mismatc',
          },
          event: { module: 'endpoint', dataset: 'endpoint.alerts', code: 'behavior' },
          process: { executable: 'C:\\Program Files\\GoodApp\\good.exe' },
          file: { path: 'C:\\Temp\\download.tmp' },
          message:
            'Endpoint exception configured on file.path = C:\\Program Files\\GoodApp\\good.exe but the endpoint alert field containing the running binary is process.executable = C:\\Program Files\\GoodApp\\good.exe. This field mismatch causes the exception to miss.',
        },
      },
    ],
  },

  endpointAlertNeedsEndpointException: {
    agentId: 'eval-agent-endpoint-exception-001',
    hostName: 'eval-endpoint-alert-needs-endpoint-ex',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-needs-endpoint-exception',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-endpoint-exception-001',
        hostName: 'eval-endpoint-alert-needs-endpoint-ex',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-needs-endpoint-exception',
        scenario: 'endpoint_alert_needs_endpoint_exception_not_siem_explicit_prompt',
      }),
      {
        index: 'logs-endpoint.alerts-default',
        document: {
          agent: { id: 'eval-agent-endpoint-exception-001' },
          elastic: { agent: { id: 'eval-agent-endpoint-exception-001' } },
          host: {
            name: 'eval-endpoint-alert-needs-endpoint-ex',
            hostname: 'eval-endpoint-alert-needs-endpoint-ex',
          },
          event: { module: 'endpoint', dataset: 'endpoint.alerts', code: 'malicious_file' },
          file: {
            path: 'C:\\Users\\Public\\blocked-tool.exe',
            hash: { sha256: 'evalblockedtoolsha256' },
          },
          rule: { name: 'Malware Prevention Alert' },
          message:
            'User created a SIEM Rule Exception for this alert, but no Endpoint Alert Exception exists for policy eval-policy-needs-endpoint-exception. SIEM Rule Exceptions do not reach the Elastic Defend agent, so endpoint blocking continues.',
        },
      },
    ],
  },

  trustedAppWrongConditionField: {
    agentId: 'eval-agent-trusted-app-field-001',
    hostName: 'eval-trusted-app-wrong-condition-fiel',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-trusted-app-field',
    endpointStatus: 'degraded',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-trusted-app-field-001',
        hostName: 'eval-trusted-app-wrong-condition-fiel',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-trusted-app-field',
        endpointStatus: 'degraded',
        scenario: 'trusted_app_wrong_condition_field',
      }),
      {
        index: 'logs-endpoint.events.process-default',
        document: {
          agent: { id: 'eval-agent-trusted-app-field-001' },
          elastic: { agent: { id: 'eval-agent-trusted-app-field-001' } },
          host: {
            name: 'eval-trusted-app-wrong-condition-fiel',
            hostname: 'eval-trusted-app-wrong-condition-fiel',
          },
          event: { category: 'process', type: 'start' },
          process: {
            executable: 'C:\\Program Files\\NoisyApp\\noisy.exe',
            name: 'noisy.exe',
          },
          message:
            'Trusted Application was configured with file.path = C:\\Program Files\\NoisyApp\\ but endpoint process events show process.executable = C:\\Program Files\\NoisyApp\\noisy.exe, so the Trusted Application condition does not match.',
        },
      },
    ],
  },

  linuxHighCpuMonitoringScripts: {
    agentId: 'eval-agent-linux-cpu-script-001',
    hostName: 'eval-linux-high-cpu-monitoring-script',
    os: {
      name: 'Linux',
      version: '26.04',
      type: 'linux',
      platform: 'ubuntu',
      full: 'Ubuntu 26.04',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-linux-cpu-script',
    endpointStatus: 'degraded',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-linux-cpu-script-001',
        hostName: 'eval-linux-high-cpu-monitoring-script',
        os: {
          name: 'Linux',
          version: '26.04',
          type: 'linux',
          platform: 'ubuntu',
          full: 'Ubuntu 26.04',
        },
        policyId: 'eval-policy-linux-cpu-script',
        endpointStatus: 'degraded',
        scenario: 'linux_high_cpu_monitoring_scripts',
      }),
      {
        index: 'metrics-endpoint.metrics-default',
        document: {
          agent: { id: 'eval-agent-linux-cpu-script-001' },
          host: {
            name: 'eval-linux-high-cpu-monitoring-script',
            hostname: 'eval-linux-high-cpu-monitoring-script',
          },
          Endpoint: {
            metrics: {
              system_impact: [
                {
                  process: { executable: '/opt/monitoring/check_database.sh' },
                  process_events: { week_ms: 888888 },
                  file_events: { week_ms: 4200 },
                  overall: { week_ms: 999999 },
                },
              ],
            },
          },
        },
      },
      {
        index: 'logs-endpoint.events.process-default',
        document: {
          agent: { id: 'eval-agent-linux-cpu-script-001' },
          elastic: { agent: { id: 'eval-agent-linux-cpu-script-001' } },
          host: {
            name: 'eval-linux-high-cpu-monitoring-script',
            hostname: 'eval-linux-high-cpu-monitoring-script',
          },
          event: { category: 'process', type: 'start' },
          process: {
            name: 'curl',
            executable: '/usr/bin/curl',
            parent: { executable: '/opt/monitoring/check_database.sh' },
          },
          message:
            'Hourly monitoring script /opt/monitoring/check_database.sh spawns many short-lived child processes; /usr/bin/curl process starts dominate Endpoint process event CPU.',
        },
      },
    ],
  },

  windowsHighCpuAuthenticationEvents: {
    agentId: 'eval-agent-windows-cpu-auth-001',
    hostName: 'eval-windows-high-cpu-authentication-',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-windows-cpu-auth',
    endpointStatus: 'degraded',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-windows-cpu-auth-001',
        hostName: 'eval-windows-high-cpu-authentication-',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-windows-cpu-auth',
        endpointStatus: 'degraded',
        scenario: 'windows_high_cpu_authentication_events',
      }),
      {
        index: 'metrics-endpoint.metrics-default',
        document: {
          agent: { id: 'eval-agent-windows-cpu-auth-001' },
          host: {
            name: 'eval-windows-high-cpu-authentication-',
            hostname: 'eval-windows-high-cpu-authentication-',
          },
          Endpoint: {
            metrics: {
              system_impact: [
                {
                  process: { executable: 'C:\\Windows\\System32\\lsass.exe' },
                  authentication_events: { week_ms: 1999999 },
                  process_events: { week_ms: 1200 },
                  overall: { week_ms: 2001199 },
                },
              ],
            },
          },
          message:
            'elastic-endpoint high CPU: authentication_events dominate system impact; Windows Security event IDs 4624 and 4634 occur 75 times per second on this domain controller.',
        },
      },
    ],
  },

  linuxMissedCheckinsSelinux203Exec: {
    agentId: 'eval-agent-linux-selinux-001',
    hostName: 'eval-linux-missed-checkins-selinux-20',
    os: {
      name: 'Linux',
      version: '26.04',
      type: 'linux',
      platform: 'ubuntu',
      full: 'Ubuntu 26.04',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-linux-selinux',
    endpointStatus: 'failed',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-linux-selinux-001',
        hostName: 'eval-linux-missed-checkins-selinux-20',
        os: {
          name: 'Linux',
          version: '26.04',
          type: 'linux',
          platform: 'ubuntu',
          full: 'Ubuntu 26.04',
        },
        policyId: 'eval-policy-linux-selinux',
        endpointStatus: 'failed',
        scenario: 'linux_missed_checkins_selinux_203_exec',
      }),
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-linux-selinux-001',
        hostName: 'eval-linux-missed-checkins-selinux-20',
        message:
          'Elastic Agent reports Endpoint component FAILED: endpoint service missed 3 check-ins. journalctl -u ElasticEndpoint.service shows code=exited, status=203/EXEC. SELinux audit denied { execute } for /opt/Elastic/Endpoint/elastic-endpoint with unlabeled_t context.',
      }),
    ],
  },

  windowsMissedCheckinsCrashDump: {
    agentId: 'eval-agent-windows-crash-dump-001',
    hostName: 'eval-windows-missed-checkins-crash-du',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-windows-crash-dump',
    endpointStatus: 'failed',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-windows-crash-dump-001',
        hostName: 'eval-windows-missed-checkins-crash-du',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-windows-crash-dump',
        endpointStatus: 'failed',
        scenario: 'windows_missed_checkins_crash_dump',
      }),
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-windows-crash-dump-001',
        hostName: 'eval-windows-missed-checkins-crash-du',
        message:
          'Elastic Agent reports Endpoint component FAILED: endpoint service missed 3 check-ins. Endpoint process crashed repeatedly and generated elasticendpoint.dmp in C:\\Program Files\\Elastic\\Endpoint\\cache\\CrashDumps\\elasticendpoint.dmp before Agent marked it failed.',
      }),
    ],
  },

  outputKafkaMessageSizeRejection: {
    agentId: 'eval-agent-kafka-size-001',
    hostName: 'eval-output-kafka-message-size-reject',
    os: {
      name: 'Linux',
      version: '26.04',
      type: 'linux',
      platform: 'ubuntu',
      full: 'Ubuntu 26.04',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-kafka-size',
    endpointStatus: 'degraded',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-kafka-size-001',
        hostName: 'eval-output-kafka-message-size-reject',
        os: {
          name: 'Linux',
          version: '26.04',
          type: 'linux',
          platform: 'ubuntu',
          full: 'Ubuntu 26.04',
        },
        policyId: 'eval-policy-kafka-size',
        endpointStatus: 'degraded',
        scenario: 'output_kafka_message_size_rejection_explicit_prompt',
      }),
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-kafka-size-001',
        hostName: 'eval-output-kafka-message-size-reject',
        message:
          'KafkaClient failed to deliver record with unrecoverable error: Broker: Message size too large [10] | non-retriable; repeated delivery failures correlate with 100% CPU',
      }),
    ],
  },

  windowsBsodNetworkDriverRegression: {
    agentId: 'eval-agent-bsod-network-001',
    hostName: 'eval-windows-bsod-network-driver-regr',
    os: {
      name: 'Windows',
      version: '10.0.20348',
      type: 'windows',
      platform: 'windows',
      family: 'windows',
      full: 'Windows Server 2022',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-bsod-network',
    endpointStatus: 'degraded',
    agentVersion: '8.18.3',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-bsod-network-001',
        hostName: 'eval-windows-bsod-network-driver-regr',
        os: {
          name: 'Windows',
          version: '10.0.20348',
          type: 'windows',
          platform: 'windows',
          family: 'windows',
          full: 'Windows Server 2022',
        },
        policyId: 'eval-policy-bsod-network',
        endpointStatus: 'degraded',
        agentVersion: '8.18.3',
        scenario: 'windows_bsod_network_driver_regression_explicit_prompt',
      }),
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-bsod-network-001',
        hostName: 'eval-windows-bsod-network-driver-regr',
        message:
          'Windows BSOD bugcheck KERNEL_MODE_HEAP_CORRUPTION; crash dump stack references elastic_endpoint_driver.sys after many long-lived network connections idle for 30 minutes; Elastic Defend version 8.18.3',
      }),
    ],
  },

  incompatibleAwsVpcCniEbpfConflict: {
    agentId: 'eval-agent-aws-vpc-cni-001',
    hostName: 'eval-incompatible-aws-vpc-cni-ebpf-co',
    os: {
      name: 'Linux',
      version: '26.04',
      type: 'linux',
      platform: 'ubuntu',
      full: 'Ubuntu 26.04',
    },
    policyName: DEFAULT_POLICY_NAME,
    policyStatus: 'success',
    policyId: 'eval-policy-aws-vpc-cni',
    extraDocuments: [
      createPolicyResponseDocument({
        agentId: 'eval-agent-aws-vpc-cni-001',
        hostName: 'eval-incompatible-aws-vpc-cni-ebpf-co',
        os: {
          name: 'Linux',
          version: '26.04',
          type: 'linux',
          platform: 'ubuntu',
          full: 'Ubuntu 26.04',
        },
        policyId: 'eval-policy-aws-vpc-cni',
        scenario: 'incompatible_aws_vpc_cni_ebpf_conflict',
      }),
      createEndpointSecurityLogDocument({
        agentId: 'eval-agent-aws-vpc-cni-001',
        hostName: 'eval-incompatible-aws-vpc-cni-ebpf-co',
        message:
          'Kubernetes node runs AWS VPC CNI aws-network-policy-agent using TC eBPF. After Elastic Defend installed host isolation TC eBPF probes, NetworkPolicy traffic that should be denied is allowed after about 18 hours.',
      }),
    ],
  },
} satisfies Record<string, EndpointScenario>;
