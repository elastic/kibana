/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates profiling data in the Universal Profiling (ECS) schema for hosts that each run a Java
 * service, a Python service, a native service and kernel workers. The `otel_profiling` scenario
 * uses other workloads and hosts, so that the data of each schema is easy to tell apart.
 *
 * Usage: node scripts/synthtrace universal_profiling --live
 * Options: --scenarioOpts.hosts=3 --scenarioOpts.samplesPerSecond=20 (per host)
 */

import type { UniversalProfilingDocument } from '@kbn/synthtrace-client';
import { universalProfiling } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { getUniversalProfilingMetadataDocuments, withClient } from '@kbn/synthtrace';
import type { ProfilingSample, ProfilingWorkload } from './helpers/profiling_workloads';
import {
  calls,
  getProfilingScenarioOptions,
  isFirstTickOfHostReportInterval,
  jvm,
  kernel,
  native,
  ProfilingSampler,
  python,
  TICK_INTERVAL,
} from './helpers/profiling_workloads';

const PROJECT_ID = '1';
const FIRST_HOST_ID = 7_524_068_811_327_416_000n;

interface Host {
  id: string;
  name: string;
  ip: string;
}

const receiveFromSocket = calls(kernel('entry_SYSCALL_64_after_hwframe'), 0, [
  calls(kernel('do_syscall_64'), 2, [
    calls(kernel('__x64_sys_recvfrom'), 0, [
      calls(kernel('tcp_recvmsg'), 6, [calls(kernel('_raw_spin_unlock_bh'), 3)]),
    ]),
    calls(kernel('__x64_sys_epoll_wait'), 0, [calls(kernel('ep_poll'), 4)]),
  ]),
]);

const WORKLOADS: ProfilingWorkload[] = [
  {
    serviceName: 'checkout-service',
    executable: 'java',
    threads: ['http-nio-8080-exec-1', 'http-nio-8080-exec-2', 'http-nio-8080-exec-3'],
    callTree: calls(native('libc.so.6', 'start_thread'), 0, [
      calls(native('libjvm.so', 'thread_native_entry(Thread*)'), 0, [
        calls(native('libjvm.so', 'JavaThread::run()'), 0, [
          calls(jvm('Thread.java', 'void java.lang.Thread.run()', 840), 0, [
            calls(
              jvm(
                'CheckoutController.java',
                'Receipt co.elastic.checkout.CheckoutController.placeOrder(Order)',
                58
              ),
              4,
              [
                calls(
                  jvm(
                    'PricingService.java',
                    'BigDecimal co.elastic.checkout.PricingService.calculateTotal(Cart)',
                    112
                  ),
                  30,
                  [
                    calls(
                      jvm(
                        'BigDecimal.java',
                        'BigDecimal java.math.BigDecimal.multiply(BigDecimal)',
                        1520
                      ),
                      25
                    ),
                    calls(
                      jvm(
                        'DiscountRules.java',
                        'Discount co.elastic.checkout.DiscountRules.apply(Cart)',
                        41
                      ),
                      15
                    ),
                  ]
                ),
                calls(
                  jvm(
                    'InventoryClient.java',
                    'void co.elastic.checkout.InventoryClient.reserve(Item)',
                    77
                  ),
                  2,
                  [
                    calls(
                      jvm(
                        'SocketInputStream.java',
                        'int java.net.SocketInputStream.read(byte[], int, int)',
                        168
                      ),
                      1,
                      [
                        calls(
                          native('libnet.so', 'Java_java_net_SocketInputStream_socketRead0'),
                          1,
                          [calls(native('libc.so.6', 'recv'), 1, [receiveFromSocket])]
                        ),
                      ]
                    ),
                  ]
                ),
                calls(
                  jvm(
                    'ObjectMapper.java',
                    'String com.fasterxml.jackson.databind.ObjectMapper.writeValueAsString(Object)',
                    3964
                  ),
                  12
                ),
              ]
            ),
          ]),
        ]),
      ]),
    ]),
  },
  {
    serviceName: 'checkout-service',
    executable: 'java',
    threads: ['GC Thread#0', 'GC Thread#1'],
    callTree: calls(native('libc.so.6', 'start_thread'), 0, [
      calls(native('libjvm.so', 'thread_native_entry(Thread*)'), 0, [
        calls(native('libjvm.so', 'WorkerThread::run()'), 2, [
          calls(native('libjvm.so', 'G1ParScanThreadState::trim_queue()'), 14),
          calls(native('libjvm.so', 'G1ParScanThreadState::copy_to_survivor_space(oopDesc*)'), 10),
        ]),
      ]),
    ]),
  },
  {
    serviceName: 'recommendation-service',
    executable: 'python3.12',
    threads: ['python3.12'],
    callTree: calls(native('python3.12', '_start'), 0, [
      calls(native('libc.so.6', '__libc_start_main'), 0, [
        calls(native('python3.12', 'Py_RunMain'), 0, [
          calls(native('python3.12', '_PyEval_EvalFrameDefault'), 3, [
            calls(python('server.py', 'serve', 31), 0, [
              calls(python('handlers.py', 'handle_request', 54), 4, [
                calls(python('recommender.py', 'recommend', 22), 6, [
                  calls(python('recommender.py', 'score_items', 47), 20, [
                    calls(native('libopenblas.so.0', 'cblas_dgemm'), 2, [
                      calls(native('libopenblas.so.0', 'dgemm_kernel_HASWELL'), 35),
                    ]),
                  ]),
                  calls(python('features.py', 'load_features', 88), 8),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  },
  {
    serviceName: 'inventory-service',
    executable: 'inventory-service',
    threads: ['inventory-service'],
    callTree: calls(native('inventory-service', 'runtime.goexit'), 0, [
      calls(native('inventory-service', 'net/http.(*conn).serve'), 3, [
        calls(native('inventory-service', 'main.(*Handler).Reserve'), 4, [
          calls(native('inventory-service', 'database/sql.(*DB).QueryContext'), 2, [
            calls(native('inventory-service', 'syscall.Syscall6'), 1, [receiveFromSocket]),
          ]),
          calls(native('inventory-service', 'encoding/json.Marshal'), 6),
        ]),
      ]),
    ]),
  },
  {
    threads: ['kworker/u16:2', 'kworker/3:1'],
    callTree: calls(kernel('ret_from_fork'), 0, [
      calls(kernel('kthread'), 0, [
        calls(kernel('worker_thread'), 1, [
          calls(kernel('process_one_work'), 0, [
            calls(kernel('ext4_end_io_rsv_work'), 3),
            calls(kernel('blk_mq_run_work_fn'), 2),
          ]),
        ]),
      ]),
    ]),
  },
];

const getHosts = (count: number): Host[] =>
  Array.from({ length: count }, (_, hostIndex) => ({
    id: String(FIRST_HOST_ID + BigInt(hostIndex)),
    name: `up-host-${hostIndex}`,
    ip: `10.0.0.${hostIndex + 1}`,
  }));

// Like the OTel Collector exporter, writes one event per sample, because Elasticsearch 9.2+
// counts the events and ignores their `Stacktrace.count`.
const toEvent = (
  host: Host,
  { workload, stackTrace, threadName }: ProfilingSample,
  timestamp: number
) =>
  universalProfiling
    .event({
      'Stacktrace.id': stackTrace.id,
      'Stacktrace.count': 1,
      'profiling.project.id': PROJECT_ID,
      'host.id': host.id,
      'host.name': host.name,
      'host.ip': host.ip,
      'process.thread.name': threadName,
      ...(workload.executable ? { 'process.executable.name': workload.executable } : {}),
      ...(workload.serviceName
        ? {
            'service.name': workload.serviceName,
            'container.name': `${workload.serviceName}-${host.name}`,
            'orchestrator.resource.name': workload.serviceName,
          }
        : {}),
    })
    .timestamp(timestamp);

const scenario: Scenario<UniversalProfilingDocument> = async ({ logger, scenarioOpts }) => {
  const { hostCount, samplesPerSecond } = getProfilingScenarioOptions(scenarioOpts);
  const hosts = getHosts(hostCount);
  const sampler = new ProfilingSampler(WORKLOADS);

  return {
    bootstrap: async ({ universalProfilingEsClient }) => {
      await universalProfilingEsClient.setupResources();
      await universalProfilingEsClient.loadMetadata(
        sampler.getStackTraces().flatMap(getUniversalProfilingMetadataDocuments)
      );
    },
    generate: ({ range, clients: { universalProfilingEsClient } }) => {
      const data = range
        .interval(TICK_INTERVAL)
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((host) => [
            ...sampler.sample(samplesPerSecond).map((sample) => toEvent(host, sample, timestamp)),
            ...(isFirstTickOfHostReportInterval(timestamp)
              ? [
                  universalProfiling
                    .host({
                      'host.id': host.id,
                      'host.name': host.name,
                      'profiling.project.id': PROJECT_ID,
                      'profiling.host.name': host.name,
                      'profiling.host.ip': host.ip,
                      'profiling.host.machine': 'x86_64',
                      'profiling.host.kernel_version': '6.8.0',
                      'profiling.agent.version': '9.1.0',
                    })
                    .timestamp(timestamp),
                ]
              : []),
          ])
        );

      return withClient(
        universalProfilingEsClient,
        logger.perf('generating_universal_profiling_data', () => data)
      );
    },
  };
};

export default scenario;
