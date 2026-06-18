# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automatic_troubleshooting/automatic_troubleshooting.spec.ts >> Automatic Troubleshooting >> policy response failure
- Location: x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts:138:26

# Error details

```
KbnClientRequesterError: [POST - http://localhost:5621/internal/inference/prompt] request failed (attempt=1/0): undefined -- Status: N/A, Cause: fetch failed -- and ran out of retries
```

```
ConnectionError: connection failed (http://elastic:changeme@localhost:9221/)
```

# Test source

```ts
  129 |     question: 'Why is endpoint eval-windows-missed-checkins-crash-du unhealthy?',
  130 |     criteria: [
  131 |       ...COMMON_CRITERIA,
  132 |       'Queried current endpoint or agent health evidence for eval-windows-missed-checkins-crash-du',
  133 |       'Identified missed check-ins caused by repeated elastic-endpoint.exe crashes rather than a policy response failure',
  134 |       'Mentioned the crash dump path C:\\Program Files\\Elastic\\Endpoint\\cache\\CrashDumps\\elasticendpoint.dmp',
  135 |       'Recommended collecting the crash dump or diagnostics and restarting the service or rebooting as recovery steps',
  136 |     ],
  137 |   },
  138 |   {
  139 |     name: 'output_kafka_message_size_rejection_explicit_prompt',
  140 |     description:
  141 |       'Validates that the agent diagnoses Kafka output rejection from oversized messages.',
  142 |     question:
  143 |       'Why is endpoint eval-output-kafka-message-size-reject degraded with Kafka output errors?',
  144 |     criteria: [
  145 |       ...COMMON_CRITERIA,
  146 |       'Queried endpoint security log evidence for eval-output-kafka-message-size-reject',
  147 |       'Identified Kafka Broker: Message size too large or max.message.bytes as the root cause',
  148 |       'Explained the version-aware behavior that newer versions drop non-retriable oversized messages instead of retrying indefinitely',
  149 |       'Recommended increasing Kafka topic or broker message-size limits or reducing event sizes with filters or Trusted Applications',
  150 |     ],
  151 |   },
  152 |   {
  153 |     name: 'windows_bsod_network_driver_regression_explicit_prompt',
  154 |     description: 'Validates that the agent diagnoses the Windows network driver BSOD regression.',
  155 |     question:
  156 |       'Why did eval-windows-bsod-network-driver-regr blue screen after installing Elastic Defend?',
  157 |     criteria: [
  158 |       ...COMMON_CRITERIA,
  159 |       'Queried BSOD or endpoint security log evidence for eval-windows-bsod-network-driver-regr',
  160 |       'Identified KERNEL_MODE_HEAP_CORRUPTION with elastic_endpoint_driver.sys on Elastic Defend 8.18.3',
  161 |       'Recognized this as the known network driver pool corruption regression involving long-lived idle network connections',
  162 |       'Recommended upgrading to 8.18.4 or disabling advanced.kernel.network as an immediate mitigation with the host-isolation tradeoff',
  163 |     ],
  164 |   },
  165 |   {
  166 |     name: 'incompatible_aws_vpc_cni_ebpf_conflict',
  167 |     description:
  168 |       'Validates that the agent diagnoses AWS VPC CNI network policy failures caused by TC eBPF conflicts.',
  169 |     question:
  170 |       'Why did network policies stop working on Elastic Defend endpoint eval-incompatible-aws-vpc-cni-ebpf-co?',
  171 |     criteria: [
  172 |       ...COMMON_CRITERIA,
  173 |       'Queried endpoint or endpoint security log evidence for eval-incompatible-aws-vpc-cni-ebpf-co',
  174 |       'Identified a TC eBPF conflict between Elastic Defend host isolation probes and AWS VPC CNI aws-network-policy-agent',
  175 |       'Explained that disabling Linux network event collection does not fix the host isolation TC probe conflict',
  176 |       'Recommended setting linux.advanced.host_isolation.allowed to false if host isolation is not required',
  177 |     ],
  178 |   },
  179 |   {
  180 |     name: 'currently_healthy_endpoint_no_active_issue',
  181 |     description:
  182 |       'Validates that the agent reports a currently healthy endpoint and asks for a specific symptom instead of mining logs or inventing a root cause.',
  183 |     question: 'Why is endpoint eval-currently-healthy-endpoint unhealthy?',
  184 |     criteria: [
  185 |       ...COMMON_CRITERIA,
  186 |       'Queried current endpoint and agent state and the newest policy response for eval-currently-healthy-endpoint',
  187 |       'Concluded the endpoint is currently healthy based on the successful newest policy response and current endpoint metadata, instead of asserting a root cause',
  188 |       'Did not call integration_knowledge or search warning/error logs to manufacture a root cause for the healthy endpoint',
  189 |       'Asked the user for a specific symptom, time range, alert, or behavior to investigate instead of reporting a root cause',
  190 |     ],
  191 |   },
  192 | ] as const;
  193 | 
  194 | evaluate.describe('Automatic Troubleshooting', { tag: tags.stateful.classic }, () => {
  195 |   let unitedTransformId: string;
  196 | 
  197 |   evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, chatClient, log }) => {
  198 |     await waitForEndpointPackage(kbnClient, esClient, log);
  199 | 
  200 |     const { transforms } = await esClient.transform.getTransformStats({
  201 |       transform_id: UNITED_TRANSFORM_WILDCARD,
  202 |     });
  203 |     unitedTransformId = transforms[0].id;
  204 | 
  205 |     try {
  206 |       await chatClient.converse({ message: 'hello' });
  207 |     } catch (e) {
  208 |       log.warning(`Warmup failed: ${e}`);
  209 |     }
  210 | 
  211 |     const clients = { esClient, internalEsClient };
  212 |     await cleanupSeededData(clients);
  213 | 
  214 |     // waiting for transforms takes a while so seed all scenarios here
  215 |     for (const scenario of Object.values(SCENARIOS)) {
  216 |       await seedScenario(clients, scenario);
  217 |     }
  218 | 
  219 |     await waitForTransformPropagation(esClient, log, {
  220 |       metadataCurrent: ALL_SCENARIO_COUNT,
  221 |       metadataUnited: ALL_SCENARIO_COUNT,
  222 |     });
  223 |   });
  224 | 
  225 |   evaluate('incompatible antivirus detection', async ({ evaluateDataset }) => {
  226 |     await evaluateDataset({
  227 |       dataset: {
  228 |         name: 'endpoint: incompatible antivirus detection',
> 229 |         description:
      |     ^ ConnectionError: connection failed (http://elastic:changeme@localhost:9221/)
  230 |           'Validates that the agent detects incompatible antivirus software on an endpoint.',
  231 |         examples: [
  232 |           {
  233 |             input: {
  234 |               question:
  235 |                 'Can you check if endpoint eval-host-av has any conflicting antivirus software?',
  236 |             },
  237 |             output: {
  238 |               criteria: [
  239 |                 `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
  240 |                 'Queried endpoint metadata or process events to investigate the issue',
  241 |                 'Identified incompatible antivirus software on the endpoint',
  242 |                 'Called generate_insight to persist structured findings',
  243 |               ],
  244 |             },
  245 |           },
  246 |         ],
  247 |       },
  248 |     });
  249 |   });
  250 | 
  251 |   evaluate('policy response failure', async ({ evaluateDataset }) => {
  252 |     await evaluateDataset({
  253 |       dataset: {
  254 |         name: 'endpoint: policy response failure',
  255 |         description:
  256 |           'Validates that the agent identifies a policy application failure and its root cause.',
  257 |         examples: [
  258 |           {
  259 |             input: {
  260 |               question: 'I see a policy failure on host eval-host-policy. Can you troubleshoot?',
  261 |             },
  262 |             output: {
  263 |               criteria: [
  264 |                 `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
  265 |                 'Queried policy response data to investigate the failure',
  266 |                 'Identified the policy application failure and its cause',
  267 |                 'Called generate_insight to persist structured findings',
  268 |               ],
  269 |             },
  270 |           },
  271 |         ],
  272 |       },
  273 |     });
  274 |   });
  275 | 
  276 |   for (const evalDefinition of P0_EVALS) {
  277 |     evaluate(evalDefinition.name, async ({ evaluateDataset }) => {
  278 |       await evaluateDataset({
  279 |         dataset: {
  280 |           name: `endpoint: ${evalDefinition.name}`,
  281 |           description: evalDefinition.description,
  282 |           examples: [
  283 |             {
  284 |               input: {
  285 |                 question: evalDefinition.question,
  286 |               },
  287 |               output: {
  288 |                 criteria: [...evalDefinition.criteria],
  289 |               },
  290 |             },
  291 |           ],
  292 |         },
  293 |       });
  294 |     });
  295 |   }
  296 | 
  297 |   evaluate.describe('with stopped united transform', () => {
  298 |     evaluate.beforeAll(async ({ esClient }) => {
  299 |       await esClient.transform.stopTransform({
  300 |         transform_id: UNITED_TRANSFORM_WILDCARD,
  301 |         wait_for_completion: true,
  302 |       });
  303 |     });
  304 | 
  305 |     evaluate('missing_endpoint_list_stopped_united_transform', async ({ evaluateDataset }) => {
  306 |       await evaluateDataset({
  307 |         dataset: {
  308 |           name: 'endpoint: missing_endpoint_list_stopped_united_transform',
  309 |           description:
  310 |             'Validates that the agent detects a stopped united metadata transform and recommends restarting it.',
  311 |           examples: [
  312 |             {
  313 |               input: {
  314 |                 question: 'I am missing endpoints on the endpoint list page. Can you troubleshoot?',
  315 |               },
  316 |               output: {
  317 |                 criteria: [
  318 |                   `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
  319 |                   'Called get_package_configurations to inspect transform settings and stats',
  320 |                   'Identified that the endpoint.metadata_united transform is stopped',
  321 |                   'Recommended restarting the stopped transform as a remediation step',
  322 |                   'Called generate_insight to persist structured findings',
  323 |                 ],
  324 |               },
  325 |             },
  326 |           ],
  327 |         },
  328 |       });
  329 |     });
```