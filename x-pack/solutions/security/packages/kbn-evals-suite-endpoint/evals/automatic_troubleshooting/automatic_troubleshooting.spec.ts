/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { METADATA_UNITED_TRANSFORM } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { evaluate } from '../../src/evaluate';
import {
  waitForEndpointPackage,
  waitForTransformPropagation,
  seedScenario,
  SCENARIOS,
} from '../../src/data_generators/endpoint_data';
import { cleanupSeededData } from '../../src/data_generators/cleanup';

const SKILL_PATH = 'skills/security/endpoint/elastic-defend-configuration-troubleshooting/SKILL.md';
const UNITED_TRANSFORM_WILDCARD = `${METADATA_UNITED_TRANSFORM}*`;
const ALL_SCENARIO_COUNT = Object.keys(SCENARIOS).length;

const COMMON_CRITERIA = [
  `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
  'Called automatic_troubleshooting.check_endpoint_package_freshness before the final diagnosis',
  'Called automatic_troubleshooting.generate_insight to persist structured findings',
] as const;

const P0_EVALS = [
  {
    name: 'endpoint_alerts_missing_output_shipping_failure_explicit_prompt',
    description:
      'Validates that the agent identifies missing endpoint alerts caused by failed Logstash output shipping.',
    question:
      'Why are endpoint alerts missing for host eval-endpoint-alerts-missing-output-s? The policy looks successful.',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried evidence for eval-endpoint-alerts-missing-output-s in endpoint metadata, policy response, or endpoint security logs',
      'Identified the Logstash output SSL handshake or output connectivity failure as the reason alert documents are not reaching Elasticsearch',
      'Explained that the policy response is successful and the missing alerts are caused by telemetry shipping, not policy application',
      'Recommended checking Fleet output or Logstash SSL configuration and verifying event flow after the output is fixed',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 30,
  },
  {
    name: 'endpoint_exception_field_mismatch_explicit_prompt',
    description:
      'Validates that the agent detects an Endpoint Alert Exception field/value mismatch.',
    question:
      'Why is my Elastic Defend endpoint exception not suppressing alerts on endpoint eval-endpoint-exception-field-mismatc?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried endpoint alert evidence for eval-endpoint-exception-field-mismatc',
      'Identified that the exception used file.path while the alert value that should match is process.executable',
      'Explained that Endpoint Alert Exceptions require literal field matching against the alert document',
      'Recommended recreating the endpoint exception with process.executable = C:\\Program Files\\GoodApp\\good.exe or comparing entries to the alert fields',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'automatic_troubleshooting.get_endpoint_artifacts',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 12,
  },
  {
    name: 'endpoint_alert_needs_endpoint_exception_not_siem_explicit_prompt',
    description:
      'Validates that the agent distinguishes SIEM rule exceptions from Endpoint Alert Exceptions.',
    question:
      'I added a SIEM rule exception, so why does Elastic Defend still block on eval-endpoint-alert-needs-endpoint-ex?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried evidence for eval-endpoint-alert-needs-endpoint-ex and its endpoint alert or artifact state',
      'Identified that a SIEM Rule Exception does not reach the Elastic Defend endpoint agent',
      'Explained that endpoint blocking requires an Endpoint Alert Exception rather than only a detection rule exception',
      'Recommended creating an Endpoint Alert Exception assigned to the affected policy or using alert fields such as file hash, signature, or path',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 8,
  },
  {
    name: 'trusted_app_wrong_condition_field',
    description:
      'Validates that the agent identifies a Trusted Application condition field mismatch.',
    question:
      'Why is my trusted app not working on endpoint eval-trusted-app-wrong-condition-fiel?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried process or artifact evidence for eval-trusted-app-wrong-condition-fiel',
      'Identified that the Trusted Application condition used the wrong field, such as file.path, while the process event shows process.executable',
      'Recommended using process.executable = C:\\Program Files\\NoisyApp\\noisy.exe for the Trusted Application entry',
      'Explained that field/operator mismatches silently prevent Trusted Applications from matching the running process',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'automatic_troubleshooting.get_endpoint_artifacts',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 22,
  },
  {
    name: 'linux_high_cpu_monitoring_scripts',
    description:
      'Validates that the agent diagnoses Linux high CPU from monitoring script process churn.',
    question: 'Why is Elastic Defend using high CPU on eval-linux-high-cpu-monitoring-script?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried endpoint metrics or process events for eval-linux-high-cpu-monitoring-script',
      'Identified process_events as the dominant CPU impact category',
      'Identified /opt/monitoring/check_database.sh or its short-lived child processes as the source of process churn',
      'Recommended a targeted Trusted Application, Event Filter, or event reduction strategy rather than treating this as a policy response failure',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.integration_knowledge',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 32,
  },
  {
    name: 'windows_high_cpu_authentication_events',
    description:
      'Validates that the agent diagnoses Windows high CPU from authentication event volume.',
    question: 'Why is Elastic Defend causing high CPU on eval-windows-high-cpu-authentication-?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried endpoint metrics for eval-windows-high-cpu-authentication-',
      'Identified authentication_events or Windows Security event IDs 4624 and 4634 as the dominant CPU source',
      'Recognized the policy response is successful and the degraded state is caused by event processing load',
      'Recommended event filters, Trusted Applications for noisy sources, or disabling Malicious Behavior Protection only when acceptable',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 28,
  },
  {
    name: 'linux_missed_checkins_selinux_203_exec',
    description:
      'Validates that the agent diagnoses Linux missed check-ins caused by SELinux 203/EXEC denial.',
    question: 'Why is endpoint eval-linux-missed-checkins-selinux-20 unhealthy?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried current endpoint or agent health evidence for eval-linux-missed-checkins-selinux-20',
      'Identified missed check-ins with systemd status 203/EXEC',
      'Identified SELinux denied execute on /opt/Elastic/Endpoint/elastic-endpoint with an unlabeled_t context as the cause',
      'Recommended fixing the SELinux file context with semanage or restorecon and restarting ElasticEndpoint.service',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 22,
  },
  {
    name: 'windows_missed_checkins_crash_dump',
    description:
      'Validates that the agent diagnoses Windows missed check-ins caused by repeated Endpoint crashes.',
    question: 'Why is endpoint eval-windows-missed-checkins-crash-du unhealthy?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried current endpoint or agent health evidence for eval-windows-missed-checkins-crash-du',
      'Identified missed check-ins caused by repeated elastic-endpoint.exe crashes rather than a policy response failure',
      'Mentioned the crash dump path C:\\Program Files\\Elastic\\Endpoint\\cache\\CrashDumps\\elasticendpoint.dmp',
      'Recommended collecting the crash dump or diagnostics and restarting the service or rebooting as recovery steps',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 20,
  },
  {
    name: 'output_kafka_message_size_rejection_explicit_prompt',
    description:
      'Validates that the agent diagnoses Kafka output rejection from oversized messages.',
    question:
      'Why is endpoint eval-output-kafka-message-size-reject degraded with Kafka output errors?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried endpoint security log evidence for eval-output-kafka-message-size-reject',
      'Identified Kafka Broker: Message size too large or max.message.bytes as the root cause',
      'Explained the version-aware behavior that newer versions drop non-retriable oversized messages instead of retrying indefinitely',
      'Recommended increasing Kafka topic or broker message-size limits or reducing event sizes with filters or Trusted Applications',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 25,
  },
  {
    name: 'windows_bsod_network_driver_regression_explicit_prompt',
    description: 'Validates that the agent diagnoses the Windows network driver BSOD regression.',
    question:
      'Why did eval-windows-bsod-network-driver-regr blue screen after installing Elastic Defend?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried BSOD or endpoint security log evidence for eval-windows-bsod-network-driver-regr',
      'Identified KERNEL_MODE_HEAP_CORRUPTION with elastic_endpoint_driver.sys on Elastic Defend 8.18.3',
      'Recognized this as the known network driver pool corruption regression involving long-lived idle network connections',
      'Recommended upgrading to 8.18.4 or disabling advanced.kernel.network as an immediate mitigation with the host-isolation tradeoff',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'platform.core.integration_knowledge',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 24,
  },
  {
    name: 'incompatible_aws_vpc_cni_ebpf_conflict',
    description:
      'Validates that the agent diagnoses AWS VPC CNI network policy failures caused by TC eBPF conflicts.',
    question:
      'Why did network policies stop working on Elastic Defend endpoint eval-incompatible-aws-vpc-cni-ebpf-co?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried endpoint or endpoint security log evidence for eval-incompatible-aws-vpc-cni-ebpf-co',
      'Identified a TC eBPF conflict between Elastic Defend host isolation probes and AWS VPC CNI aws-network-policy-agent',
      'Explained that disabling Linux network event collection does not fix the host isolation TC probe conflict',
      'Recommended setting linux.advanced.host_isolation.allowed to false if host isolation is not required',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.integration_knowledge',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 24,
  },
  {
    name: 'currently_healthy_endpoint_no_active_issue',
    description:
      'Validates that the agent reports a currently healthy endpoint and asks for a specific symptom instead of mining logs or inventing a root cause.',
    question: 'Why is endpoint eval-currently-healthy-endpoint unhealthy?',
    criteria: [
      ...COMMON_CRITERIA,
      'Queried current endpoint and agent state and the newest policy response for eval-currently-healthy-endpoint',
      'Concluded the endpoint is currently healthy based on the successful newest policy response and current endpoint metadata, instead of asserting a root cause',
      'Did not call integration_knowledge or search warning/error logs to manufacture a root cause for the healthy endpoint',
      'Asked the user for a specific symptom, time range, alert, or behavior to investigate instead of reporting a root cause',
    ],
    expectedToolCalls: [
      'filestore.read',
      'automatic_troubleshooting.check_endpoint_package_freshness',
      'platform.core.search',
      'automatic_troubleshooting.generate_insight',
    ],
    maxToolCalls: 22,
  },
] as const;

evaluate.describe('Automatic Troubleshooting', { tag: tags.stateful.classic }, () => {
  let unitedTransformId: string;

  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, chatClient, log }) => {
    await waitForEndpointPackage(kbnClient, esClient, log);

    const { transforms } = await esClient.transform.getTransformStats({
      transform_id: UNITED_TRANSFORM_WILDCARD,
    });
    unitedTransformId = transforms[0].id;

    try {
      await chatClient.converse({ message: 'hello' });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }

    const clients = { esClient, internalEsClient };
    await cleanupSeededData(clients);

    // waiting for transforms takes a while so seed all scenarios here
    for (const scenario of Object.values(SCENARIOS)) {
      await seedScenario(clients, scenario);
    }

    await waitForTransformPropagation(esClient, log, {
      metadataCurrent: ALL_SCENARIO_COUNT,
      metadataUnited: ALL_SCENARIO_COUNT,
    });
  });

  evaluate('incompatible antivirus detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: incompatible antivirus detection',
        description:
          'Validates that the agent detects incompatible antivirus software on an endpoint.',
        examples: [
          {
            input: {
              question:
                'Can you check if endpoint eval-host-av has any conflicting antivirus software?',
            },
            output: {
              criteria: [
                `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                'Queried endpoint metadata or process events to investigate the issue',
                'Identified incompatible antivirus software on the endpoint',
                'Called automatic_troubleshooting.generate_insight to persist structured findings',
              ],
              expectedToolCalls: [
                'filestore.read',
                'automatic_troubleshooting.check_endpoint_package_freshness',
                'platform.core.integration_knowledge',
                'automatic_troubleshooting.generate_insight',
              ],
              maxToolCalls: 26,
            },
          },
        ],
      },
    });
  });

  evaluate('policy response failure', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: policy response failure',
        description:
          'Validates that the agent identifies a policy application failure and its root cause.',
        examples: [
          {
            input: {
              question: 'I see a policy failure on host eval-host-policy. Can you troubleshoot?',
            },
            output: {
              criteria: [
                `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                'Queried policy response data to investigate the failure',
                'Identified the policy application failure and its cause',
                'Called automatic_troubleshooting.generate_insight to persist structured findings',
              ],
              expectedToolCalls: [
                'filestore.read',
                'automatic_troubleshooting.check_endpoint_package_freshness',
                'automatic_troubleshooting.get_package_configurations',
                'automatic_troubleshooting.generate_insight',
              ],
              maxToolCalls: 23,
            },
          },
        ],
      },
    });
  });

  for (const evalDefinition of P0_EVALS) {
    evaluate(evalDefinition.name, async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: `endpoint: ${evalDefinition.name}`,
          description: evalDefinition.description,
          examples: [
            {
              input: {
                question: evalDefinition.question,
              },
              output: {
                criteria: [...evalDefinition.criteria],
                expectedToolCalls: [...evalDefinition.expectedToolCalls],
                maxToolCalls: evalDefinition.maxToolCalls,
              },
            },
          ],
        },
      });
    });
  }

  evaluate.describe('with stopped united transform', () => {
    evaluate.beforeAll(async ({ esClient }) => {
      await esClient.transform.stopTransform({
        transform_id: UNITED_TRANSFORM_WILDCARD,
        wait_for_completion: true,
      });
    });

    evaluate('missing_endpoint_list_stopped_united_transform', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'endpoint: missing_endpoint_list_stopped_united_transform',
          description:
            'Validates that the agent detects a stopped united metadata transform and recommends restarting it.',
          examples: [
            {
              input: {
                question: 'I am missing endpoints on the endpoint list page. Can you troubleshoot?',
              },
              output: {
                criteria: [
                  `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                  'Inspected transform settings and stats to identify why endpoints are missing from the list',
                  'Identified that the endpoint.metadata_united transform is stopped',
                  'Recommended restarting the stopped transform as a remediation step',
                  'Called automatic_troubleshooting.generate_insight to persist structured findings',
                ],
                expectedToolCalls: [
                  'filestore.read',
                  'automatic_troubleshooting.check_endpoint_package_freshness',
                  'platform.core.search',
                  'automatic_troubleshooting.get_package_configurations',
                  'automatic_troubleshooting.generate_insight',
                ],
                maxToolCalls: 15,
              },
            },
          ],
        },
      });
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      try {
        await esClient.transform.startTransform({
          transform_id: unitedTransformId,
        });
      } catch (e) {
        log.warning(`Failed to restart transform: ${e}`);
      }
    });
  });

  evaluate.afterAll(async ({ esClient, internalEsClient }) => {
    // defensive restart in case scenario 3 failed mid-execution and the nested afterAll
    // didn't run. Safe no-op if the transform is already started or doesn't exist.
    try {
      await esClient.transform.startTransform({
        transform_id: unitedTransformId,
      });
    } catch {
      // noop
    }

    await esClient.deleteByQuery({
      index: '.edr-workflow-insights-*',
      query: { match_all: {} },
      refresh: true,
      ignore_unavailable: true,
    });

    await cleanupSeededData({ esClient, internalEsClient });
  });
});
