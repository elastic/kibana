/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnalyticsEvents {
  homepageLoaded = 'homepage_loaded',
  installSampleDataClick = 'homepage_install_sample_data_click',
  // Deprecated ingestion CTA events
  // ingestionCTAVariantLoaded = 'homepage_ingestion_cta_variant_loaded',
  // ingestVariantInstallSampleDataClick = 'homepage_ingest_variant_install_sample_data_click',
  // ingestVariantUploadFileClick = 'homepage_ingest_variant_upload_file_click',
  // ingestVariantWebCrawlerClick = 'homepage_ingest_variant_web_crawler_click',
  // ingestVariantConnectorsClick = 'homepage_ingest_variant_add_connector_click',
  // ingestVariantManageAPIKeysClick = 'homepage_ingest_variant_manage_api_keys_click',
}
