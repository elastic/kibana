/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type {
  HealthDiagnosticConfiguration,
  IndicesMetadataConfiguration,
  IngestPipelinesStatsConfiguration,
  PaginationConfiguration,
  TelemetrySenderChannelConfiguration,
  TelemetryQueryConfiguration,
} from './types';
import type { RssGrowthCircuitBreakerConfig } from './diagnostic/circuit_breakers/rss_growth_circuit_breaker';
import type { TimeoutCircuitBreakerConfig } from './diagnostic/circuit_breakers/timeout_circuit_breaker';
import type { EventLoopUtilizationCircuitBreakerConfig } from './diagnostic/circuit_breakers/event_loop_utilization_circuit_breaker';
import type { EventLoopDelayCircuitBreakerConfig } from './diagnostic/circuit_breakers/event_loop_delay_circuit_breaker';
import type { ElasticsearchCircuitBreakerConfig } from './diagnostic/circuit_breakers/elastic_search_circuit_breaker';
import type { HealthDiagnosticQueryConfig } from './diagnostic/health_diagnostic_service.types';

class TelemetryConfigurationDTO {
  private readonly DEFAULT_TELEMETRY_MAX_BUFFER_SIZE = 100;
  private readonly DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH = 100;
  private readonly DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH = 300;
  private readonly DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH = 1_000;
  private readonly DEFAULT_MAX_DETECTION_ALERTS_BATCH = 50;
  private readonly DEFAULT_ASYNC_SENDER = false;
  private readonly DEFAULT_SENDER_CHANNELS = {};
  private readonly DEFAULT_PAGINATION_CONFIG = {
    // default to 2% of host's total memory or 80MiB, whichever is smaller
    max_page_size_bytes: Math.min(os.totalmem() * 0.02, 80 * 1024 * 1024),
    num_docs_to_sample: 10,
  };
  private readonly DEFAULT_INDICES_METADATA_CONFIG = {
    indices_threshold: 10_000,
    datastreams_threshold: 1000,
    indices_settings_threshold: 10_000,

    index_query_size: 1024,
    ilm_stats_query_size: 1024,
    ilm_policy_query_size: 1024,

    max_prefixes: 10, // @deprecated
    max_group_size: 100, // @deprecated
    min_group_size: 5, // @deprecated
  };
  private readonly DEFAULT_INGEST_PIPELINES_STATS_CONFIG = {
    enabled: true,
  };
  private readonly DEFAULT_HEALTH_DIAGNOSTIC_CONFIG: HealthDiagnosticConfiguration = {
    query: {
      maxDocuments: 10_000,
      bufferSize: 1_000,
    } as HealthDiagnosticQueryConfig,
    rssGrowthCircuitBreaker: {
      maxRssGrowthPercent: 40,
      validationIntervalMs: 500,
    } as RssGrowthCircuitBreakerConfig,
    timeoutCircuitBreaker: {
      timeoutMillis: 5000,
      validationIntervalMs: 500,
    } as TimeoutCircuitBreakerConfig,
    eventLoopUtilizationCircuitBreaker: {
      thresholdMillis: 5000,
      validationIntervalMs: 500,
    } as EventLoopUtilizationCircuitBreakerConfig,
    eventLoopDelayCircuitBreaker: {
      thresholdMillis: 500,
      validationIntervalMs: 250,
    } as EventLoopDelayCircuitBreakerConfig,
    elasticsearchCircuitBreaker: {
      maxJvmHeapUsedPercent: 90,
      maxCpuPercent: 90,
      expectedClusterHealth: ['green', 'yellow'],
      validationIntervalMs: 1000,
    } as ElasticsearchCircuitBreakerConfig,
  };
  private readonly DEFAULT_QUERY_CONFIG: TelemetryQueryConfiguration = {
    pageSize: 500,
    maxResponseSize: 10 * 1024 * 1024, // 10 MB
    maxCompressedResponseSize: 8 * 1024 * 1024, // 8 MB
    excludeColdAndFrozenTiers: async () => {
      return false;
    },
  };
  private readonly DEFAULT_ENCRYPTION_PUBLIC_KEYS: Record<string, string> = {};

  private _telemetry_max_buffer_size = this.DEFAULT_TELEMETRY_MAX_BUFFER_SIZE;
  private _max_security_list_telemetry_batch = this.DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH;
  private _max_endpoint_telemetry_batch = this.DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH;
  private _max_detection_rule_telemetry_batch = this.DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH;
  private _max_detection_alerts_batch = this.DEFAULT_MAX_DETECTION_ALERTS_BATCH;
  private _use_async_sender = this.DEFAULT_ASYNC_SENDER;
  private _sender_channels: {
    [key: string]: TelemetrySenderChannelConfiguration;
  } = this.DEFAULT_SENDER_CHANNELS;
  private _pagination_config: PaginationConfiguration = this.DEFAULT_PAGINATION_CONFIG;
  private _indices_metadata_config: IndicesMetadataConfiguration =
    this.DEFAULT_INDICES_METADATA_CONFIG;
  private _ingest_pipelines_stats_config: IngestPipelinesStatsConfiguration =
    this.DEFAULT_INGEST_PIPELINES_STATS_CONFIG;
  private _health_diagnostic_config: HealthDiagnosticConfiguration =
    this.DEFAULT_HEALTH_DIAGNOSTIC_CONFIG;
  private _query_config: TelemetryQueryConfiguration = this.DEFAULT_QUERY_CONFIG;
  private _encryption_public_keys: Record<string, string> = this.DEFAULT_ENCRYPTION_PUBLIC_KEYS;

  public get telemetry_max_buffer_size(): number {
    return this._telemetry_max_buffer_size;
  }

  public set telemetry_max_buffer_size(num: number) {
    this._telemetry_max_buffer_size = num;
  }

  public get max_security_list_telemetry_batch(): number {
    return this._max_security_list_telemetry_batch;
  }

  public set max_security_list_telemetry_batch(num: number) {
    this._max_security_list_telemetry_batch = num;
  }

  public get max_endpoint_telemetry_batch(): number {
    return this._max_endpoint_telemetry_batch;
  }

  public set max_endpoint_telemetry_batch(num: number) {
    this._max_endpoint_telemetry_batch = num;
  }

  public get max_detection_rule_telemetry_batch(): number {
    return this._max_detection_rule_telemetry_batch;
  }

  public set max_detection_rule_telemetry_batch(num: number) {
    this._max_detection_rule_telemetry_batch = num;
  }

  public get max_detection_alerts_batch(): number {
    return this._max_detection_alerts_batch;
  }

  public set max_detection_alerts_batch(num: number) {
    this._max_detection_alerts_batch = num;
  }

  public get use_async_sender(): boolean {
    return this._use_async_sender;
  }

  public set use_async_sender(num: boolean) {
    this._use_async_sender = num;
  }

  public set sender_channels(config: { [key: string]: TelemetrySenderChannelConfiguration }) {
    this._sender_channels = config;
  }

  public get sender_channels(): { [key: string]: TelemetrySenderChannelConfiguration } {
    return this._sender_channels;
  }

  public set pagination_config(paginationConfiguration: PaginationConfiguration) {
    this._pagination_config = paginationConfiguration;
  }

  public get pagination_config(): PaginationConfiguration {
    return this._pagination_config;
  }

  public set indices_metadata_config(indicesMetadataConfiguration: IndicesMetadataConfiguration) {
    this._indices_metadata_config = indicesMetadataConfiguration;
  }

  public get indices_metadata_config(): IndicesMetadataConfiguration {
    return this._indices_metadata_config;
  }

  public set ingest_pipelines_stats_config(
    ingestPipelinesStatsConfiguration: IngestPipelinesStatsConfiguration
  ) {
    this._ingest_pipelines_stats_config = ingestPipelinesStatsConfiguration;
  }

  public get ingest_pipelines_stats_config(): IngestPipelinesStatsConfiguration {
    return this._ingest_pipelines_stats_config;
  }

  public set health_diagnostic_config(
    healthDiagnosticConfiguration: HealthDiagnosticConfiguration
  ) {
    this._health_diagnostic_config = healthDiagnosticConfiguration;
  }

  public get health_diagnostic_config(): HealthDiagnosticConfiguration {
    return this._health_diagnostic_config;
  }

  public set query_config(queryConfiguration: TelemetryQueryConfiguration) {
    this._query_config = queryConfiguration;
  }

  public get query_config(): TelemetryQueryConfiguration {
    return this._query_config;
  }

  public set encryption_public_keys(keys: Record<string, string>) {
    this._encryption_public_keys = keys;
  }

  public get encryption_public_keys(): Record<string, string> {
    return this._encryption_public_keys;
  }

  public resetAllToDefault() {
    this._telemetry_max_buffer_size = this.DEFAULT_TELEMETRY_MAX_BUFFER_SIZE;
    this._max_security_list_telemetry_batch = this.DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH;
    this._max_endpoint_telemetry_batch = this.DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH;
    this._max_detection_rule_telemetry_batch = this.DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH;
    this._max_detection_alerts_batch = this.DEFAULT_MAX_DETECTION_ALERTS_BATCH;
    this._sender_channels = this.DEFAULT_SENDER_CHANNELS;
    this._pagination_config = this.DEFAULT_PAGINATION_CONFIG;
    this._indices_metadata_config = this.DEFAULT_INDICES_METADATA_CONFIG;
    this._ingest_pipelines_stats_config = this.DEFAULT_INGEST_PIPELINES_STATS_CONFIG;
    this._health_diagnostic_config = this.DEFAULT_HEALTH_DIAGNOSTIC_CONFIG;
    this._query_config = this.DEFAULT_QUERY_CONFIG;
    this._encryption_public_keys = this.DEFAULT_ENCRYPTION_PUBLIC_KEYS;
  }
}

export const telemetryConfiguration = new TelemetryConfigurationDTO();
