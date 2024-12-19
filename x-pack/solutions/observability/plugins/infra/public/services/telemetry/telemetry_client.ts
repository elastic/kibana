/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  AddMetricsCalloutEventParams,
  AnomalyDetectionDateFieldChangeParams,
  AnomalyDetectionFilterFieldChangeParams,
  AnomalyDetectionPartitionFieldChangeParams,
  AnomalyDetectionSetupParams,
  AssetDashboardLoadedParams,
  AssetDetailsFlyoutViewedParams,
  AssetDetailsPageViewedParams,
  HostEntryClickedParams,
  HostFlyoutFilterActionParams,
  HostsViewQueryHostsCountRetrievedParams,
  HostsViewQuerySubmittedParams,
  InfraTelemetryEventTypes,
  ITelemetryClient,
  PerformanceMetricInnerEvents,
} from './types';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the Infra plugin
 */
export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportHostEntryClicked = ({
    hostname,
    cloud_provider: cloudProvider,
  }: HostEntryClickedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED, {
      hostname,
      cloud_provider: cloudProvider ?? 'unknown',
    });
  };

  public reportHostFlyoutFilterRemoved = ({
    field_name: fieldName,
  }: HostFlyoutFilterActionParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_REMOVED, {
      field_name: fieldName,
    });
  };

  public reportHostFlyoutFilterAdded = ({
    field_name: fieldName,
  }: HostFlyoutFilterActionParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_ADDED, {
      field_name: fieldName,
    });
  };

  public reportHostsViewQuerySubmitted = (params: HostsViewQuerySubmittedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED, params);
  };

  public reportHostsViewTotalHostCountRetrieved(
    params: HostsViewQueryHostsCountRetrievedParams
  ): void {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED,
      params
    );
  }

  public reportAssetDetailsFlyoutViewed = (params: AssetDetailsFlyoutViewedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ASSET_DETAILS_FLYOUT_VIEWED, params);
  };

  public reportAssetDetailsPageViewed = (params: AssetDetailsPageViewedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ASSET_DETAILS_PAGE_VIEWED, params);
  };

  public reportAssetDashboardLoaded = (params: AssetDashboardLoadedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ASSET_DASHBOARD_LOADED, params);
  };

  public reportPerformanceMetricEvent = (
    eventName: string,
    duration: number,
    innerEvents: PerformanceMetricInnerEvents = {},
    meta: Record<string, unknown> = {}
  ) => {
    reportPerformanceMetricEvent(this.analytics, {
      eventName,
      duration,
      meta,
      ...innerEvents,
    });
  };

  public reportAddMetricsCalloutAddMetricsClicked = (params: AddMetricsCalloutEventParams) => {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_ADD_METRICS_CLICKED,
      params
    );
  };

  public reportAddMetricsCalloutTryItClicked = (params: AddMetricsCalloutEventParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_TRY_IT_CLICKED, params);
  };

  public reportAddMetricsCalloutLearnMoreClicked = (params: AddMetricsCalloutEventParams) => {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_LEARN_MORE_CLICKED,
      params
    );
  };

  public reportAddMetricsCalloutDismissed = (params: AddMetricsCalloutEventParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_DISMISSED, params);
  };

  public reportAnomalyDetectionSetup = (params: AnomalyDetectionSetupParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.ANOMALY_DETECTION_SETUP, params);
  };

  public reportAnomalyDetectionDateFieldChange = (
    params: AnomalyDetectionDateFieldChangeParams
  ) => {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.ANOMALY_DETECTION_DATE_FIELD_CHANGE,
      params
    );
  };

  public reportAnomalyDetectionPartitionFieldChange = (
    params: AnomalyDetectionPartitionFieldChangeParams
  ) => {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.ANOMALY_DETECTION_PARTITION_FIELD_CHANGE,
      params
    );
  };

  public reportAnomalyDetectionFilterFieldChange = (
    params: AnomalyDetectionFilterFieldChangeParams
  ) => {
    this.analytics.reportEvent(
      InfraTelemetryEventTypes.ANOMALY_DETECTION_FILTER_FIELD_CHANGE,
      params
    );
  };
}
