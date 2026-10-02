/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates Universal Profiling data for a few hosts that each run a Java service, a Python
 * service, a native service and kernel workers. Their stacks are described as call trees below.
 *
 * Usage: node scripts/synthtrace universal_profiling --live
 * Options: --scenarioOpts.hosts=3 --scenarioOpts.samplesPerSecond=20 (per host)
 */

import type {
  UniversalProfilingDocument,
  UniversalProfilingEventDocument,
} from '@kbn/synthtrace-client';
import { universalProfiling } from '@kbn/synthtrace-client';
import type {
  Scenario,
  UniversalProfilingCallTree,
  UniversalProfilingFrame,
  UniversalProfilingStackTrace,
} from '@kbn/synthtrace';
import { createUniversalProfilingStackTraces, withClient } from '@kbn/synthtrace';
import { FrameType } from '@kbn/profiling-utils';

// Live mode generates one 1s bucket at a time and an interval emits at the start of each bucket,
// so longer intervals would be emitted on every bucket. Ticking every second keeps the rates right.
const TICK_INTERVAL = '1s';
const TICK_INTERVAL_MS = 1_000;
const HOST_REPORT_INTERVAL_MS = 60_000;

const DEFAULT_HOSTS = 3;
// The agent samples each CPU core 20 times per second, so this is a host with one busy core.
const DEFAULT_SAMPLES_PER_SECOND = 20;

const PROJECT_ID = '1';
const FIRST_HOST_ID = 7_524_068_811_327_416_000n;

const native = (executable: string, functionName: string): UniversalProfilingFrame => ({
  type: FrameType.Native,
  executable,
  functionName,
});

const kernel = (functionName: string): UniversalProfilingFrame => ({
  type: FrameType.Kernel,
  executable: 'vmlinux',
  functionName,
});

const jvm = (
  fileName: string,
  functionName: string,
  lineNumber: number
): UniversalProfilingFrame => ({
  type: FrameType.JVM,
  fileName,
  functionName,
  lineNumber,
});

const python = (
  fileName: string,
  functionName: string,
  lineNumber: number
): UniversalProfilingFrame => ({ type: FrameType.Python, fileName, functionName, lineNumber });

const calls = (
  frame: UniversalProfilingFrame,
  selfWeight: number,
  children: UniversalProfilingCallTree[] = []
): UniversalProfilingCallTree => ({ frame, selfWeight, children });

const receiveFromSocket = calls(kernel('entry_SYSCALL_64_after_hwframe'), 0, [
  calls(kernel('do_syscall_64'), 2, [
    calls(kernel('__x64_sys_recvfrom'), 0, [
      calls(kernel('tcp_recvmsg'), 6, [calls(kernel('_raw_spin_unlock_bh'), 3)]),
    ]),
    calls(kernel('__x64_sys_epoll_wait'), 0, [calls(kernel('ep_poll'), 4)]),
  ]),
]);

interface Workload {
  threads: string[];
  callTree: UniversalProfilingCallTree;
  serviceName?: string;
  executable?: string;
}

const WORKLOADS: Workload[] = [
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

interface Host {
  id: string;
  name: string;
  ip: string;
}

interface WeightedStackTrace {
  workload: Workload;
  stackTrace: UniversalProfilingStackTrace;
  cumulativeWeight: number;
}

const getHosts = (count: number): Host[] =>
  Array.from({ length: count }, (_, hostIndex) => ({
    id: String(FIRST_HOST_ID + BigInt(hostIndex)),
    name: `profiling-host-${hostIndex}`,
    ip: `10.0.0.${hostIndex + 1}`,
  }));

const getWeightedStackTraces = (): WeightedStackTrace[] => {
  let cumulativeWeight = 0;

  return WORKLOADS.flatMap((workload) =>
    createUniversalProfilingStackTraces(workload.callTree).map((stackTrace) => {
      cumulativeWeight += stackTrace.weight;
      return { workload, stackTrace, cumulativeWeight };
    })
  );
};

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const pickWeightedStackTrace = (stackTraces: WeightedStackTrace[]): WeightedStackTrace => {
  const target = Math.random() * stackTraces[stackTraces.length - 1].cumulativeWeight;
  return stackTraces.find(({ cumulativeWeight }) => target < cumulativeWeight) ?? stackTraces[0];
};

// The agent reports one event per stack trace and thread with the number of samples it got.
const getHostEvents = (
  host: Host,
  stackTraces: WeightedStackTrace[],
  samplesPerSecond: number
): UniversalProfilingEventDocument[] => {
  const events = new Map<string, UniversalProfilingEventDocument>();

  for (let sampleIndex = 0; sampleIndex < samplesPerSecond; sampleIndex++) {
    const { workload, stackTrace } = pickWeightedStackTrace(stackTraces);
    const threadName = pickRandom(workload.threads);
    const key = `${stackTrace.id}/${threadName}`;
    const event = events.get(key);

    if (event) {
      event['Stacktrace.count'] = (event['Stacktrace.count'] ?? 0) + 1;
      continue;
    }

    events.set(key, {
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
    });
  }

  return Array.from(events.values());
};

const isFirstTickOfHostReportInterval = (timestamp: number): boolean =>
  Math.floor(timestamp / HOST_REPORT_INTERVAL_MS) !==
  Math.floor((timestamp - TICK_INTERVAL_MS) / HOST_REPORT_INTERVAL_MS);

const scenario: Scenario<UniversalProfilingDocument> = async ({ logger, scenarioOpts }) => {
  const { hosts: hostCount = DEFAULT_HOSTS, samplesPerSecond = DEFAULT_SAMPLES_PER_SECOND } =
    scenarioOpts ?? {};
  const hosts = getHosts(Number(hostCount));
  const stackTraces = getWeightedStackTraces();

  return {
    bootstrap: async ({ universalProfilingEsClient }) => {
      await universalProfilingEsClient.setupResources();
      await universalProfilingEsClient.loadMetadata(
        stackTraces.flatMap(({ stackTrace }) => stackTrace.documents)
      );
    },
    generate: ({ range, clients: { universalProfilingEsClient } }) => {
      const data = range
        .interval(TICK_INTERVAL)
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((host) => [
            ...getHostEvents(host, stackTraces, Number(samplesPerSecond)).map((event) =>
              universalProfiling.event(event).timestamp(timestamp)
            ),
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
