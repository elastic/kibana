# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: siem_readiness/siem_readiness.spec.ts >> SIEM Readiness >> full readiness report across all dimensions
- Location: x-pack/solutions/security/packages/kbn-evals-suite-siem-readiness/evals/siem_readiness/siem_readiness.spec.ts:121:26

# Error details

```
ConnectionError: connection failed (http://system_indices_superuser:changeme@localhost:9221/)
```

# Test source

```ts
  362 | 
  363 |   // ------------------------------------------------------------------
  364 |   // Dimension 3: Continuity — failing + healthy ingest pipelines
  365 |   // ------------------------------------------------------------------
  366 |   log.info('[siem-readiness] Setting up ingest pipelines');
  367 | 
  368 |   // Create the failing pipeline — the `fail` processor fires only when fail_me == true.
  369 |   await esClient.ingest.putPipeline({
  370 |     id: SIEM_READINESS_PIPELINE_NAME,
  371 |     description: 'SIEM readiness eval — deliberate failures for continuity dimension testing',
  372 |     processors: [
  373 |       {
  374 |         fail: {
  375 |           message: 'deliberate test failure for siem-readiness evals',
  376 |           if: 'ctx?.fail_me == true',
  377 |         },
  378 |       },
  379 |       {
  380 |         set: {
  381 |           field: 'processed',
  382 |           value: true,
  383 |         },
  384 |       },
  385 |     ],
  386 |   });
  387 | 
  388 |   // Create the healthy pipeline — no failure logic.
  389 |   await esClient.ingest.putPipeline({
  390 |     id: SIEM_READINESS_PIPELINE_OK_NAME,
  391 |     description: 'SIEM readiness eval — healthy pipeline for continuity dimension testing',
  392 |     processors: [
  393 |       {
  394 |         set: {
  395 |           field: 'processed',
  396 |           value: true,
  397 |         },
  398 |       },
  399 |     ],
  400 |   });
  401 | 
  402 |   // continuityBad must match logs-* (fetch_pipelines discovers pipelines via logs-* index settings).
  403 |   // logs-* matches the Fleet data-stream-only template — indices.create is rejected.
  404 |   // Create a dedicated template with default_pipeline set so the backing index has it,
  405 |   // then create the data stream explicitly.
  406 |   await esClient.indices.putIndexTemplate({
  407 |     name: CONTINUITY_BAD_TEMPLATE_NAME,
  408 |     index_patterns: [SIEM_READINESS_INDICES.continuityBad],
  409 |     data_stream: {},
  410 |     priority: 500,
  411 |     template: {
  412 |       settings: { index: { default_pipeline: SIEM_READINESS_PIPELINE_NAME } },
  413 |       mappings: {
  414 |         properties: {
  415 |           '@timestamp': { type: 'date' },
  416 |         },
  417 |       },
  418 |     },
  419 |   });
  420 |   await esClient.indices.createDataStream({ name: SIEM_READINESS_INDICES.continuityBad });
  421 | 
  422 |   // Attach the healthy pipeline to the network index as default_pipeline.
  423 |   await esClient.indices.putSettings({
  424 |     index: SIEM_READINESS_INDICES.network,
  425 |     settings: { index: { default_pipeline: SIEM_READINESS_PIPELINE_OK_NAME } },
  426 |   });
  427 | 
  428 |   // Index 100 normal docs through the failing pipeline — these succeed.
  429 |   const normalDocs = buildContinuityNormalDocs();
  430 |   const normalOperations = normalDocs.flatMap((doc) => [
  431 |     { create: { _index: SIEM_READINESS_INDICES.continuityBad } },
  432 |     doc,
  433 |   ]);
  434 |   await esClient.bulk({
  435 |     refresh: true,
  436 |     pipeline: SIEM_READINESS_PIPELINE_NAME,
  437 |     operations: normalOperations,
  438 |   });
  439 | 
  440 |   // Index 3 docs with fail_me: true — these trigger the pipeline's fail processor.
  441 |   // The pipeline's failed counter increments even though the docs are rejected.
  442 |   // We catch errors because bulk will return 500 for the failed items.
  443 |   const failDocs = buildContinuityFailDocs();
  444 |   const failOperations = failDocs.flatMap((doc) => [
  445 |     { create: { _index: SIEM_READINESS_INDICES.continuityBad } },
  446 |     doc,
  447 |   ]);
  448 |   try {
  449 |     await esClient.bulk({
  450 |       refresh: true,
  451 |       pipeline: SIEM_READINESS_PIPELINE_NAME,
  452 |       operations: failOperations,
  453 |     });
  454 |   } catch (err) {
  455 |     log.debug(
  456 |       `fail-docs bulk rejected as expected (pipeline fail processor fired): ${
  457 |         err instanceof Error ? err.message : String(err)
  458 |       }`
  459 |     );
  460 |   }
  461 | 
> 462 |   log.info(
      |   ^ ConnectionError: connection failed (http://system_indices_superuser:changeme@localhost:9221/)
  463 |     `[siem-readiness] Continuity pipelines seeded: ` +
  464 |       `${SIEM_READINESS_PIPELINE_NAME} (failing, ~3% failure rate), ` +
  465 |       `${SIEM_READINESS_PIPELINE_OK_NAME} (healthy)`
  466 |   );
  467 | 
  468 |   // ------------------------------------------------------------------
  469 |   // Dimension 4: Retention — data streams with DSL lifecycle policies
  470 |   // ------------------------------------------------------------------
  471 |   log.info('[siem-readiness] Setting up retention data streams');
  472 | 
  473 |   // Create a dedicated index template so the data streams can be created
  474 |   // independently of the Fleet logs-* template (which may not be present in
  475 |   // all test cluster configurations).
  476 |   await esClient.indices.putIndexTemplate({
  477 |     name: RETENTION_INDEX_TEMPLATE_NAME,
  478 |     index_patterns: [RETENTION_SHORT_DS, RETENTION_LONG_DS],
  479 |     data_stream: {},
  480 |     priority: 500,
  481 |     template: {
  482 |       mappings: {
  483 |         properties: {
  484 |           '@timestamp': { type: 'date' },
  485 |           event: { properties: { category: { type: 'keyword' } } },
  486 |           cloud: { properties: { provider: { type: 'keyword' } } },
  487 |         },
  488 |       },
  489 |     },
  490 |   });
  491 |   await esClient.indices.createDataStream({ name: RETENTION_SHORT_DS });
  492 |   await esClient.indices.createDataStream({ name: RETENTION_LONG_DS });
  493 |   await bulkIndex(esClient, RETENTION_SHORT_DS, buildRetentionDocs(5));
  494 |   await bulkIndex(esClient, RETENTION_LONG_DS, buildRetentionDocs(5));
  495 | 
  496 |   // Apply DSL retention: 180d (non-compliant — below 365d threshold)
  497 |   await esClient.indices.putDataLifecycle({
  498 |     name: RETENTION_SHORT_DS,
  499 |     data_retention: '180d',
  500 |   });
  501 | 
  502 |   // Apply DSL retention: 400d (compliant — above 365d threshold)
  503 |   await esClient.indices.putDataLifecycle({
  504 |     name: RETENTION_LONG_DS,
  505 |     data_retention: '400d',
  506 |   });
  507 | 
  508 |   log.info(
  509 |     `[siem-readiness] Retention data streams seeded: ` +
  510 |       `${RETENTION_SHORT_DS} (180d, non-compliant), ${RETENTION_LONG_DS} (400d, compliant)`
  511 |   );
  512 | 
  513 |   log.info('[siem-readiness] SIEM readiness eval data seeding complete');
  514 | };
  515 | 
  516 | // ---------------------------------------------------------------------------
  517 | // Cleanup function
  518 | // ---------------------------------------------------------------------------
  519 | 
  520 | export const cleanupSiemReadinessData = async ({
  521 |   esClient,
  522 |   log,
  523 | }: {
  524 |   esClient: Client;
  525 |   log: ToolingLog;
  526 | }): Promise<void> => {
  527 |   log.info('[siem-readiness] Cleaning up SIEM readiness eval data');
  528 | 
  529 |   // Delete retention index template
  530 |   try {
  531 |     await esClient.indices.deleteIndexTemplate({ name: RETENTION_INDEX_TEMPLATE_NAME });
  532 |     log.info(`[siem-readiness] Deleted index template ${RETENTION_INDEX_TEMPLATE_NAME}`);
  533 |   } catch (error) {
  534 |     log.warning(
  535 |       `[siem-readiness] Failed to delete index template ${RETENTION_INDEX_TEMPLATE_NAME}: ${
  536 |         error instanceof Error ? error.message : String(error)
  537 |       }`
  538 |     );
  539 |   }
  540 | 
  541 |   try {
  542 |     await esClient.indices.deleteIndexTemplate({ name: CONTINUITY_BAD_TEMPLATE_NAME });
  543 |     log.info(`[siem-readiness] Deleted index template ${CONTINUITY_BAD_TEMPLATE_NAME}`);
  544 |   } catch (error) {
  545 |     log.warning(
  546 |       `[siem-readiness] Failed to delete index template ${CONTINUITY_BAD_TEMPLATE_NAME}: ${
  547 |         error instanceof Error ? error.message : String(error)
  548 |       }`
  549 |     );
  550 |   }
  551 | 
  552 |   // Delete retention data streams
  553 |   for (const ds of [RETENTION_SHORT_DS, RETENTION_LONG_DS]) {
  554 |     try {
  555 |       await esClient.indices.deleteDataStream({ name: ds });
  556 |       log.info(`[siem-readiness] Deleted data stream ${ds}`);
  557 |     } catch (error) {
  558 |       log.warning(
  559 |         `[siem-readiness] Failed to delete data stream ${ds}: ${
  560 |           error instanceof Error ? error.message : String(error)
  561 |         }`
  562 |       );
```