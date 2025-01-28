/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { infraTelemetryEvents } from './telemetry_events';

import { TelemetryService } from './telemetry_service';
import { InfraTelemetryEventTypes } from './types';

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    service = new TelemetryService();
  });

  const getSetupParams = () => {
    const mockCoreStart = coreMock.createSetup();
    return {
      analytics: mockCoreStart.analytics,
    };
  };

  describe('#setup()', () => {
    it('should register all the custom events', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);

      expect(setupParams.analytics.registerEventType).toHaveBeenCalledTimes(
        infraTelemetryEvents.length
      );

      infraTelemetryEvents.forEach((eventConfig, pos) => {
        expect(setupParams.analytics.registerEventType).toHaveBeenNthCalledWith(
          pos + 1,
          eventConfig
        );
      });
    });
  });

  describe('#start()', () => {
    it('should return all the available tracking methods', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      expect(telemetry).toHaveProperty('reportHostEntryClicked');
      expect(telemetry).toHaveProperty('reportHostFlyoutFilterRemoved');
      expect(telemetry).toHaveProperty('reportHostFlyoutFilterAdded');
      expect(telemetry).toHaveProperty('reportHostsViewQuerySubmitted');
      expect(telemetry).toHaveProperty('reportHostsViewTotalHostCountRetrieved');
      expect(telemetry).toHaveProperty('reportAssetDetailsFlyoutViewed');
      expect(telemetry).toHaveProperty('reportAssetDetailsPageViewed');
      expect(telemetry).toHaveProperty('reportPerformanceMetricEvent');
      expect(telemetry).toHaveProperty('reportAssetDashboardLoaded');
      expect(telemetry).toHaveProperty('reportAddMetricsCalloutAddMetricsClicked');
      expect(telemetry).toHaveProperty('reportAddMetricsCalloutTryItClicked');
      expect(telemetry).toHaveProperty('reportAddMetricsCalloutLearnMoreClicked');
      expect(telemetry).toHaveProperty('reportAddMetricsCalloutDismissed');
      expect(telemetry).toHaveProperty('reportAnomalyDetectionSetup');
      expect(telemetry).toHaveProperty('reportAnomalyDetectionDateFieldChange');
      expect(telemetry).toHaveProperty('reportAnomalyDetectionPartitionFieldChange');
      expect(telemetry).toHaveProperty('reportAnomalyDetectionFilterFieldChange');
    });
  });

  describe('#reportHostEntryClicked', () => {
    it('should report hosts entry click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostEntryClicked({
        hostname: 'hostname.test',
        cloud_provider: 'gcp',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
        {
          hostname: 'hostname.test',
          cloud_provider: 'gcp',
        }
      );
    });

    it('should report hosts entry click with cloud provider equal to "unknown" if not exist', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostEntryClicked({
        hostname: 'hostname.test',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
        {
          hostname: 'hostname.test',
          cloud_provider: 'unknown',
        }
      );
    });
  });

  describe('#reportHostsViewQuerySubmitted', () => {
    it('should report hosts query and filtering submission with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostsViewQuerySubmitted({
        control_filter_fields: ['host.os.name'],
        filter_fields: [],
        interval: 'interval(now-1h)',
        with_query: false,
        limit: 100,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED,
        {
          control_filter_fields: ['host.os.name'],
          filter_fields: [],
          interval: 'interval(now-1h)',
          with_query: false,
          limit: 100,
        }
      );
    });
  });

  describe('#reportHostFlyoutFilterRemoved', () => {
    it('should report Host Flyout Filter Removed click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostFlyoutFilterRemoved({
        field_name: 'agent.version',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_REMOVED,
        {
          field_name: 'agent.version',
        }
      );
    });
  });

  describe('#reportHostFlyoutFilterAdded', () => {
    it('should report Host Flyout Filter Added click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostFlyoutFilterAdded({
        field_name: 'agent.version',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_ADDED,
        {
          field_name: 'agent.version',
        }
      );
    });
  });

  describe('#reportHostsViewTotalHostCountRetrieved', () => {
    it('should report Host Flyout Filter Added click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostsViewTotalHostCountRetrieved({
        total: 300,
        with_filters: true,
        with_query: false,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED,
        {
          total: 300,
          with_filters: true,
          with_query: false,
        }
      );
    });
  });

  describe('#reportAssetDetailsFlyoutViewed', () => {
    it('should report asset details viewed in flyout with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDetailsFlyoutViewed({
        componentName: 'infraAssetDetailsFlyout',
        assetType: 'host',
        tabId: 'overview',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DETAILS_FLYOUT_VIEWED,
        {
          componentName: 'infraAssetDetailsFlyout',
          assetType: 'host',
          tabId: 'overview',
        }
      );
    });
  });

  describe('#reportAssetDetailsPageViewed', () => {
    it('should report asset details viewed in full page with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDetailsPageViewed({
        componentName: 'infraAssetDetailsPage',
        assetType: 'host',
        tabId: 'overview',
        integrations: ['nginx'],
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DETAILS_PAGE_VIEWED,
        {
          componentName: 'infraAssetDetailsPage',
          assetType: 'host',
          tabId: 'overview',
          integrations: ['nginx'],
        }
      );
    });
  });

  describe('#reportAssetDashboardLoaded', () => {
    it('should report asset details viewed in full page with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDashboardLoaded({
        assetType: 'host',
        state: true,
        filtered_by: ['assetId'],
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DASHBOARD_LOADED,
        {
          assetType: 'host',
          state: true,
          filtered_by: ['assetId'],
        }
      );
    });
  });

  describe('#reportAddMetricsCalloutAddMetricsClicked', () => {
    it('should report add metrics callout add data click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const view = 'testView';

      telemetry.reportAddMetricsCalloutAddMetricsClicked({ view });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Add Metrics Callout Add Metrics Clicked',
        {
          view,
        }
      );
    });
  });

  describe('#reportAddMetricsCalloutTryItClicked', () => {
    it('should report add metrics callout try it click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const view = 'testView';

      telemetry.reportAddMetricsCalloutTryItClicked({
        view,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Add Metrics Callout Try It Clicked',
        {
          view,
        }
      );
    });
  });

  describe('#reportAddMetricsCalloutLearnMoreClicked', () => {
    it('should report add metrics callout learn more click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const view = 'testView';

      telemetry.reportAddMetricsCalloutLearnMoreClicked({
        view,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Add Metrics Callout Learn More Clicked',
        {
          view,
        }
      );
    });
  });

  describe('#reportAddMetricsCalloutDismissed', () => {
    it('should report add metrics callout dismiss click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const view = 'testView';

      telemetry.reportAddMetricsCalloutDismissed({
        view,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Add Metrics Callout Dismissed',
        {
          view,
        }
      );
    });
  });

  describe('#reportAnomalyDetectionSetup', () => {
    it('should report anomaly detection setup with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const jobType = 'host';
      const configuredFields = {
        start_date: new Date().toISOString(),
        partition_field: 'partitionField',
        filter_field: 'filterField',
      };

      telemetry.reportAnomalyDetectionSetup({
        job_type: jobType,
        configured_fields: configuredFields,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Infra Anomaly Detection Job Setup',
        {
          job_type: jobType,
          configured_fields: configuredFields,
        }
      );
    });
  });

  describe('#reportAnomalyDetectionDateFieldChange', () => {
    it('should report anomaly detection date field change with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const startDate = new Date().toISOString();

      telemetry.reportAnomalyDetectionDateFieldChange({
        job_type: 'host',
        start_date: startDate,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Infra Anomaly Detection Job Date Field Change',
        {
          job_type: 'host',
          start_date: startDate,
        }
      );
    });
  });

  describe('#reportAnomalyDetectionPartitionFieldChange', () => {
    it('should report anomaly detection partition field change with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAnomalyDetectionPartitionFieldChange({
        job_type: 'host',
        partition_field: 'partitionField',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Infra Anomaly Detection Job Partition Field Change',
        {
          job_type: 'host',
          partition_field: 'partitionField',
        }
      );
    });
  });

  describe('#reportAnomalyDetectionFilterFieldChange', () => {
    it('should report anomaly detection filter field change with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAnomalyDetectionFilterFieldChange({
        job_type: 'host',
        filter_field: 'filterField',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        'Infra Anomaly Detection Job Filter Field Change',
        {
          job_type: 'host',
          filter_field: 'filterField',
        }
      );
    });
  });
});
