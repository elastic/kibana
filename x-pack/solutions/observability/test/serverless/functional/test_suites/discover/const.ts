/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export const STACKTRACE_MESSAGE =
  "Error: 9 FAILED_PRECONDITION: Can't access cart storage. StackExchange.Redis.RedisTimeoutException: Timeout awaiting response (outbound=0KiB, inbound=0KiB, 5467ms elapsed, timeout is 5000ms), command=HGET, next: HGET 7578fdf6-e0b1-4b60-98b3-6751dadffd01, inst: 0, qu: 0, qs: 5, aw: False, bw: SpinningDown, rs: ReadAsync, ws: Idle, in: 377, in-pipe: 0, out-pipe: 0, last-in: 0, cur-in: 0, sync-ops: 2, async-ops: 1653332, serverEndpoint: valkey:6379, conn-sec: 1292697.71, aoc: 0, mc: 1/1/0, mgr: 10 of 10 available, clientName: cartservice-6558778458-4df9q(SE.Redis-v2.8.16.12844), IOCP: (Busy=0,Free=1000,Min=1,Max=1000), WORKER: (Busy=6,Free=32761,Min=2,Max=32767), POOL: (Threads=6,QueuedItems=7,CompletedItems=28329470,Timers=8), v: 2.8.16.12844 (Please take a look at this article for some common client-side issues that can cause timeouts: https://stackexchange.github.io/StackExchange.Redis/Timeouts)\n" +
  '   at cartservice.cartstore.ValkeyCartStore.AddItemAsync(String userId, String productId, Int32 quantity) in /usr/src/app/src/cartstore/ValkeyCartStore.cs:line 117\n' +
  '    at callErrorFromStatus (/app/node_modules/@grpc/grpc-js/build/src/call.js:31:19)\n' +
  '    at Object.onReceiveStatus (/app/node_modules/@grpc/grpc-js/build/src/client.js:193:76)\n' +
  '    at Object.onReceiveStatus (/app/node_modules/@grpc/grpc-js/build/src/client-interceptors.js:360:141)\n' +
  '    at Object.onReceiveStatus (/app/node_modules/@grpc/grpc-js/build/src/client-interceptors.js:323:181)\n' +
  '    at /app/node_modules/@grpc/grpc-js/build/src/resolving-call.js:129:78\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:77:11)\n' +
  'for call at\n' +
  '    at ServiceClientImpl.makeUnaryRequest (/app/node_modules/@grpc/grpc-js/build/src/client.js:161:32)\n' +
  '    at ServiceClientImpl.<anonymous> (/app/node_modules/@grpc/grpc-js/build/src/make-client.js:105:19)\n' +
  '    at /app/node_modules/@opentelemetry/instrumentation-grpc/build/src/clientUtils.js:131:31\n' +
  '    at /app/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:211:209\n' +
  '    at AsyncLocalStorage.run (node:async_hooks:346:14)\n' +
  '    at AsyncLocalStorageContextManager.with (/app/node_modules/@opentelemetry/context-async-hooks/build/src/AsyncLocalStorageContextManager.js:33:40)\n' +
  '    at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)\n' +
  '    at ServiceClientImpl.clientMethodTrace [as addItem] (/app/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:211:42)\n' +
  '    at /app/.next/server/pages/api/cart.js:1:1101\n' +
  '    at new ZoneAwarePromise (/app/node_modules/zone.js/bundles/zone.umd.js:1340:33)';
