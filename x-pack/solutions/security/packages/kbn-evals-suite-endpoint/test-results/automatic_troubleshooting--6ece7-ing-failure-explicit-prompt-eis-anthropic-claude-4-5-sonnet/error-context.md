# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automatic_troubleshooting/automatic_troubleshooting.spec.ts >> Automatic Troubleshooting >> endpoint_alerts_missing_output_shipping_failure_explicit_prompt
- Location: x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts:157:28

# Error details

```
Error: Timed out waiting for endpoint package to be installed after 300000ms
```

# Test source

```ts
  1   | /*
  2   |  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
  3   |  * or more contributor license agreements. Licensed under the Elastic License
  4   |  * 2.0; you may not use this file except in compliance with the Elastic License
  5   |  * 2.0.
  6   |  */
  7   | 
  8   | import type { Client } from '@elastic/elasticsearch';
  9   | import type { KbnClient } from '@kbn/test';
  10  | import type { ToolingLog } from '@kbn/tooling-log';
  11  | import {
  12  |   metadataCurrentIndexPattern,
  13  |   metadataTransformPrefix,
  14  |   METADATA_UNITED_INDEX,
  15  |   METADATA_UNITED_TRANSFORM,
  16  | } from '@kbn/security-solution-plugin/common/endpoint/constants';
  17  | 
  18  | const POLL_INTERVAL_MS = 5_000;
  19  | 
  20  | const EVAL_AGENT_ID_PREFIX = 'eval-agent-';
  21  | const EVAL_SEEDED_QUERY = { prefix: { 'agent.id': EVAL_AGENT_ID_PREFIX } };
  22  | 
  23  | export async function waitForEndpointPackage(
  24  |   kbnClient: KbnClient,
  25  |   esClient: Client,
  26  |   log: ToolingLog,
  27  |   maxWaitMs = 300_000
  28  | ): Promise<void> {
  29  |   const start = Date.now();
  30  |   log.info('Waiting for endpoint package to be installed...');
  31  | 
  32  |   while (Date.now() - start < maxWaitMs) {
  33  |     try {
  34  |       const response = await kbnClient.request<{ item: { status: string } }>({
  35  |         method: 'GET',
  36  |         path: '/api/fleet/epm/packages/endpoint',
  37  |       });
  38  | 
  39  |       if (response.data.item.status === 'installed') {
  40  |         log.info('Endpoint package is installed. Verifying transforms are started...');
  41  | 
  42  |         const statsResponse = await esClient.transform.getTransformStats({
  43  |           transform_id: 'endpoint*',
  44  |         });
  45  | 
  46  |         const stoppedTransforms = statsResponse.transforms.filter((t) => t.state === 'stopped');
  47  | 
  48  |         for (const t of stoppedTransforms) {
  49  |           log.info(`Restarting stopped transform: ${t.id}`);
  50  |           try {
  51  |             await esClient.transform.startTransform({ transform_id: t.id });
  52  |           } catch (e) {
  53  |             log.debug(`Failed to restart transform ${t.id}: ${e}`);
  54  |           }
  55  |         }
  56  | 
  57  |         const hasCurrentTransform = statsResponse.transforms.some((t) =>
  58  |           t.id.startsWith(metadataTransformPrefix)
  59  |         );
  60  |         const hasUnitedTransform = statsResponse.transforms.some((t) =>
  61  |           t.id.startsWith(METADATA_UNITED_TRANSFORM)
  62  |         );
  63  |         const allStarted =
  64  |           statsResponse.transforms.length > 0 &&
  65  |           statsResponse.transforms.every((t) => t.state === 'started' || t.state === 'indexing');
> 66  | 
      |         ^ Error: Timed out waiting for endpoint package to be installed after 300000ms
  67  |         if (hasCurrentTransform && hasUnitedTransform && allStarted) {
  68  |           log.info(
  69  |             `All endpoint transforms are running (${statsResponse.transforms.length} total)`
  70  |           );
  71  |           return;
  72  |         }
  73  | 
  74  |         log.debug(
  75  |           `Waiting for endpoint transforms (current=${hasCurrentTransform}, united=${hasUnitedTransform}): ${statsResponse.transforms
  76  |             .map((t) => `${t.id}=${t.state}`)
  77  |             .join(', ')}`
  78  |         );
  79  |       } else {
  80  |         log.debug(`Endpoint package status: ${response.data.item.status}`);
  81  |       }
  82  |     } catch (err) {
  83  |       log.debug(`Error checking endpoint package: ${err}`);
  84  |     }
  85  | 
  86  |     await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  87  |   }
  88  | 
  89  |   throw new Error(`Timed out waiting for endpoint package to be installed after ${maxWaitMs}ms`);
  90  | }
  91  | 
  92  | export async function waitForTransformPropagation(
  93  |   esClient: Client,
  94  |   log: ToolingLog,
  95  |   expectedCounts: { metadataCurrent: number; metadataUnited: number },
  96  |   maxWaitMs = 180_000
  97  | ): Promise<void> {
  98  |   const start = Date.now();
  99  |   let lastCounts = { metadataCurrent: 0, metadataUnited: 0 };
  100 |   log.info(
  101 |     `Waiting for transform propagation: metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}`
  102 |   );
  103 | 
  104 |   while (Date.now() - start < maxWaitMs) {
  105 |     try {
  106 |       const [currentCount, unitedCount] = await Promise.all([
  107 |         esClient.count({
  108 |           index: metadataCurrentIndexPattern,
  109 |           query: EVAL_SEEDED_QUERY,
  110 |           ignore_unavailable: true,
  111 |         }),
  112 |         esClient.count({
  113 |           index: METADATA_UNITED_INDEX,
  114 |           query: EVAL_SEEDED_QUERY,
  115 |           ignore_unavailable: true,
  116 |         }),
  117 |       ]);
  118 |       lastCounts = {
  119 |         metadataCurrent: currentCount.count,
  120 |         metadataUnited: unitedCount.count,
  121 |       };
  122 | 
  123 |       log.debug(
  124 |         `Transform propagation: metadataCurrent=${currentCount.count}/${expectedCounts.metadataCurrent}, metadataUnited=${unitedCount.count}/${expectedCounts.metadataUnited}`
  125 |       );
  126 | 
  127 |       if (
  128 |         currentCount.count >= expectedCounts.metadataCurrent &&
  129 |         unitedCount.count >= expectedCounts.metadataUnited
  130 |       ) {
  131 |         log.info('Transform propagation complete');
  132 |         return;
  133 |       }
  134 |     } catch (err) {
  135 |       log.debug(`Error checking transform propagation: ${err}`);
  136 |     }
  137 | 
  138 |     await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  139 |   }
  140 | 
  141 |   throw new Error(
  142 |     `Timed out waiting for transform propagation after ${maxWaitMs}ms. ` +
  143 |       `Expected metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}; ` +
  144 |       `last observed metadataCurrent=${lastCounts.metadataCurrent}, metadataUnited=${lastCounts.metadataUnited}`
  145 |   );
  146 | }
  147 | 
  148 | export interface SeedClients {
  149 |   esClient: Client;
  150 |   internalEsClient: Client;
  151 | }
  152 | 
  153 | interface ExtraDocument {
  154 |   index: string;
  155 |   document: Record<string, unknown>;
  156 | }
  157 | 
  158 | interface EndpointScenario {
  159 |   agentId: string;
  160 |   hostName: string;
  161 |   os: {
  162 |     name: string;
  163 |     version: string;
  164 |     type?: string;
  165 |     platform?: string;
  166 |     family?: string;
```