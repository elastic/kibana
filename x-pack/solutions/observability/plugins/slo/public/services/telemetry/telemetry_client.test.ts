/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { SloTelemetryClient } from './telemetry_client';
import { SloTelemetryEventTypes } from './types';

describe('SloTelemetryClient', () => {
  let reportEvent: jest.Mock;
  let analytics: AnalyticsServiceStart;
  let client: SloTelemetryClient;

  beforeEach(() => {
    reportEvent = jest.fn();
    analytics = { reportEvent } as unknown as AnalyticsServiceStart;
    client = new SloTelemetryClient(analytics);
  });

  it('reports slo_details_flyout_viewed with no params', () => {
    client.reportSloDetailsFlyoutViewed();

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_VIEWED, {});
  });

  it('reports slo_details_flyout_tab_changed with the tab id', () => {
    client.reportSloDetailsFlyoutTabChanged({ tabId: 'overview' });

    expect(reportEvent).toHaveBeenCalledWith(
      SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_TAB_CHANGED,
      { tabId: 'overview' }
    );
  });

  it('reports slo_create_flyout_viewed with the slo type', () => {
    client.reportSloCreateFlyoutViewed({ sloType: 'sli.kql.custom' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_CREATE_FLYOUT_VIEWED, {
      sloType: 'sli.kql.custom',
    });
  });

  it('reports slo_created with slo_id and template_id', () => {
    client.reportSloCreated({ slo_id: 'slo-1', template_id: 'template-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_CREATED, {
      slo_id: 'slo-1',
      template_id: 'template-1',
    });
  });

  it('reports slo_created without a template_id when the SLO was not created from a template', () => {
    client.reportSloCreated({ slo_id: 'slo-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_CREATED, {
      slo_id: 'slo-1',
    });
  });

  it('reports slo_edited with slo_id', () => {
    client.reportSloEdited({ slo_id: 'slo-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_EDITED, {
      slo_id: 'slo-1',
    });
  });

  it('reports slo_deleted with slo_id', () => {
    client.reportSloDeleted({ slo_id: 'slo-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_DELETED, {
      slo_id: 'slo-1',
    });
  });

  it('reports slo_cloned with slo_id', () => {
    client.reportSloCloned({ slo_id: 'slo-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_CLONED, {
      slo_id: 'slo-1',
    });
  });

  it('reports slo_reset with slo_id', () => {
    client.reportSloReset({ slo_id: 'slo-1' });

    expect(reportEvent).toHaveBeenCalledWith(SloTelemetryEventTypes.SLO_RESET, {
      slo_id: 'slo-1',
    });
  });
});
