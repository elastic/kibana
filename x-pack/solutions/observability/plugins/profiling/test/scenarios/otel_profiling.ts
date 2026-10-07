/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates profiling data in the OTel schema, as written by the Elasticsearch exporter of the
 * OpenTelemetry Collector, for hosts that each run a Go service, a Node.js service, a .NET
 * service and kernel softirq threads. The `universal_profiling` scenario uses other workloads and
 * hosts, so that the data of each schema is easy to tell apart.
 * Elasticsearch reads it with `"schema": "otel"` on the `_profiling` APIs.
 *
 * Usage: node scripts/synthtrace otel_profiling --live
 * Options: --scenarioOpts.hosts=3 --scenarioOpts.samplesPerSecond=20 (per host)
 *          --scenarioOpts.executableIds=hex|base64url (default: hex)
 *
 * The exporter keys executables by their hex file ID, but Elasticsearch looks them up by the
 * base64url file ID of the frames, so executable names only resolve with `base64url`.
 */

import { createHash } from 'crypto';
import type { OtelProfilingDocument } from '@kbn/synthtrace-client';
import { otelProfiling } from '@kbn/synthtrace-client';
import type { OtelExecutableIdEncoding, Scenario } from '@kbn/synthtrace';
import { getOtelProfilingMetadataDocuments, withClient } from '@kbn/synthtrace';
import type { ProfilingSample, ProfilingWorkload } from './helpers/profiling_workloads';
import {
  AGENT_SAMPLING_FREQUENCY,
  calls,
  dotNet,
  getProfilingScenarioOptions,
  go,
  isFirstTickOfHostReportInterval,
  javaScript,
  kernel,
  native,
  ProfilingSampler,
  TICK_INTERVAL,
} from './helpers/profiling_workloads';

interface Host {
  id: string;
  name: string;
}

const sendToSocket = calls(kernel('entry_SYSCALL_64_after_hwframe'), 0, [
  calls(kernel('do_syscall_64'), 1, [
    calls(kernel('__x64_sys_sendto'), 0, [
      calls(kernel('tcp_sendmsg'), 4, [
        calls(kernel('tcp_write_xmit'), 3, [calls(kernel('__dev_queue_xmit'), 2)]),
      ]),
    ]),
    calls(kernel('__x64_sys_futex'), 0, [calls(kernel('futex_wait'), 3)]),
  ]),
]);

const PAYMENT_SERVICE = 'payment-service';

const WORKLOADS: ProfilingWorkload[] = [
  {
    serviceName: PAYMENT_SERVICE,
    executable: PAYMENT_SERVICE,
    threads: [PAYMENT_SERVICE],
    callTree: calls(go(PAYMENT_SERVICE, 'asm_amd64.s', 'runtime.goexit', 1700), 0, [
      calls(go(PAYMENT_SERVICE, 'server.go', 'net/http.(*conn).serve', 2092), 2, [
        calls(go(PAYMENT_SERVICE, 'handler.go', 'main.(*PaymentHandler).Charge', 64), 4, [
          calls(go(PAYMENT_SERVICE, 'conn.go', 'crypto/tls.(*Conn).Write', 1197), 3, [
            calls(go(PAYMENT_SERVICE, 'aes_gcm.go', 'crypto/aes.(*gcmAsm).Seal', 112), 18),
          ]),
          calls(go(PAYMENT_SERVICE, 'conn.go', 'github.com/jackc/pgx/v5.(*Conn).Query', 674), 4, [
            calls(go(PAYMENT_SERVICE, 'syscall_linux.go', 'syscall.Syscall6', 95), 1, [
              sendToSocket,
            ]),
          ]),
          calls(go(PAYMENT_SERVICE, 'encode.go', 'encoding/json.Marshal', 161), 9),
        ]),
      ]),
      calls(go(PAYMENT_SERVICE, 'mgc.go', 'runtime.gcBgMarkWorker', 1435), 0, [
        calls(go(PAYMENT_SERVICE, 'mgcmark.go', 'runtime.gcDrain', 1188), 3, [
          calls(go(PAYMENT_SERVICE, 'mgcmark.go', 'runtime.scanobject', 1446), 12),
        ]),
      ]),
    ]),
  },
  {
    serviceName: 'frontend',
    executable: 'node',
    threads: ['node', 'libuv-worker'],
    callTree: calls(native('node', 'uv_run'), 0, [
      calls(native('node', 'uv__io_poll'), 3, [
        calls(native('node', 'node::InternalCallbackScope::Close()'), 0, [
          calls(
            javaScript('node:internal/process/task_queues', 'processTicksAndRejections', 95),
            1,
            [
              calls(javaScript('server.js', 'handleRequest', 42), 3, [
                calls(javaScript('render.js', 'renderPage', 18), 6, [
                  calls(javaScript('templates.js', 'compileTemplate', 77), 22),
                  calls(javaScript('templates.js', 'escapeHtml', 12), 8),
                ]),
                calls(javaScript('api.js', 'fetchCart', 31), 2, [
                  calls(native('node', 'uv__write'), 1, [sendToSocket]),
                ]),
              ]),
            ]
          ),
        ]),
      ]),
      calls(native('node', 'v8::internal::Heap::CollectGarbage'), 2, [
        calls(native('node', 'v8::internal::ScavengerCollector::CollectGarbage'), 9),
      ]),
    ]),
  },
  {
    serviceName: 'cart-service',
    executable: 'dotnet',
    threads: ['.NET ThreadPool Worker', '.NET TP Worker'],
    callTree: calls(native('libc.so.6', 'start_thread'), 0, [
      calls(native('libcoreclr.so', 'ThreadNative::KickOffThread'), 0, [
        calls(
          dotNet('ThreadPoolWorkQueue.cs', 'System.Threading.ThreadPoolWorkQueue.Dispatch', 1095),
          1,
          [
            calls(
              dotNet('CartController.cs', 'CartService.Controllers.CartController.AddItem', 37),
              4,
              [
                calls(
                  dotNet('CartStore.cs', 'CartService.Cart.RedisCartStore.UpdateCartAsync', 112),
                  5,
                  [
                    calls(
                      dotNet(
                        'ConnectionMultiplexer.cs',
                        'StackExchange.Redis.ConnectionMultiplexer.ExecuteSyncImpl',
                        2134
                      ),
                      3,
                      [calls(native('libc.so.6', 'send'), 1, [sendToSocket])]
                    ),
                  ]
                ),
                calls(
                  dotNet('JsonSerializer.cs', 'System.Text.Json.JsonSerializer.Serialize', 58),
                  11
                ),
              ]
            ),
          ]
        ),
      ]),
    ]),
  },
  {
    threads: ['ksoftirqd/0', 'ksoftirqd/1'],
    callTree: calls(kernel('ret_from_fork'), 0, [
      calls(kernel('kthread'), 0, [
        calls(kernel('smpboot_thread_fn'), 0, [
          calls(kernel('run_ksoftirqd'), 1, [
            calls(kernel('__do_softirq'), 0, [
              calls(kernel('net_rx_action'), 2, [calls(kernel('__napi_poll'), 3)]),
              calls(kernel('rcu_core'), 2),
            ]),
          ]),
        ]),
      ]),
    ]),
  },
];

// Like real OTel host IDs, which are UUIDs.
const getHostId = (hostName: string): string => {
  const hex = createHash('sha256').update(hostName).digest('hex').toUpperCase();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

const getHosts = (count: number): Host[] =>
  Array.from({ length: count }, (_, hostIndex) => {
    const name = `otel-host-${hostIndex}`;
    return { id: getHostId(name), name };
  });

const EXECUTABLE_ID_ENCODINGS: readonly OtelExecutableIdEncoding[] = ['hex', 'base64url'];

const isExecutableIdEncoding = (value: string): value is OtelExecutableIdEncoding =>
  EXECUTABLE_ID_ENCODINGS.some((encoding) => encoding === value);

const getExecutableIdEncoding = (value: string): OtelExecutableIdEncoding => {
  if (!isExecutableIdEncoding(value)) {
    throw new Error(
      `Invalid executableIds "${value}", expected one of: ${EXECUTABLE_ID_ENCODINGS.join(', ')}`
    );
  }

  return value;
};

// Like the exporter, writes one event per sample, because Elasticsearch counts the events and
// ignores their `count`.
const toEvent = (
  host: Host,
  { workload, stackTrace, threadName }: ProfilingSample,
  timestamp: number
) =>
  otelProfiling
    .event({
      'stacktrace.id': stackTrace.id,
      count: 1,
      sampling_frequency: AGENT_SAMPLING_FREQUENCY,
      resource: {
        attributes: {
          'host.id': host.id,
          'host.name': host.name,
          'thread.name': threadName,
          'process.executable.name': workload.executable ?? '',
          ...(workload.serviceName
            ? {
                'service.name': workload.serviceName,
                'container.name': `${workload.serviceName}-${host.name}`,
                'k8s.pod.name': `${workload.serviceName}-${host.name}`,
              }
            : {}),
        },
      },
    })
    .timestamp(timestamp);

const scenario: Scenario<OtelProfilingDocument> = async ({ logger, scenarioOpts }) => {
  const { hostCount, samplesPerSecond } = getProfilingScenarioOptions(scenarioOpts);
  const hosts = getHosts(hostCount);
  const { executableIds = 'hex' } = scenarioOpts ?? {};
  const executableIdEncoding = getExecutableIdEncoding(String(executableIds));
  const sampler = new ProfilingSampler(WORKLOADS);

  return {
    bootstrap: async ({ otelProfilingEsClient }) => {
      await otelProfilingEsClient.loadMetadata(
        sampler
          .getStackTraces()
          .flatMap((stackTrace) =>
            getOtelProfilingMetadataDocuments(stackTrace, executableIdEncoding)
          )
      );
    },
    generate: ({ range, clients: { otelProfilingEsClient } }) => {
      const data = range
        .interval(TICK_INTERVAL)
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((host) => [
            ...sampler.sample(samplesPerSecond).map((sample) => toEvent(host, sample, timestamp)),
            ...(isFirstTickOfHostReportInterval(timestamp)
              ? [
                  otelProfiling
                    .host({
                      resource: {
                        attributes: {
                          'host.id': host.id,
                          'host.name': host.name,
                          'host.arch': 'amd64',
                          'os.type': 'linux',
                        },
                      },
                    })
                    .timestamp(timestamp),
                ]
              : []),
          ])
        );

      return withClient(
        otelProfilingEsClient,
        logger.perf('generating_otel_profiling_data', () => data)
      );
    },
  };
};

export default scenario;
