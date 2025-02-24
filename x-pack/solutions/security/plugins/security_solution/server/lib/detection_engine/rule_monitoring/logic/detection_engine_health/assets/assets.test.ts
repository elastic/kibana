/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sourceRuleMonitoringDashboard from './dashboard_rule_monitoring.json';
import sourceKibanaEventLogDataView from './data_view_kibana_event_log.json';
import sourceManagedTag from './tag_managed.json';
import sourceSecuritySolutionTag from './tag_security_solution.json';

describe('Assets for rule monitoring', () => {
  describe('Dashboard: "[Elastic Security] Detection rule monitoring"', () => {
    it('has correct type and id', () => {
      expect(sourceRuleMonitoringDashboard).toEqual(
        expect.objectContaining({
          type: 'dashboard',
          id: 'security-detection-rule-monitoring-<spaceId>',
        })
      );
    });

    it('is marked as managed', () => {
      expect(sourceRuleMonitoringDashboard).toEqual(
        expect.objectContaining({
          managed: true,
        })
      );
    });

    it('has "coreMigrationVersion" and "typeMigrationVersion" fields', () => {
      expect(sourceRuleMonitoringDashboard).toEqual(
        expect.objectContaining({
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
        })
      );
    });

    it('has references to ".kibana-event-log-*" data view', () => {
      expect(sourceRuleMonitoringDashboard).toEqual(
        expect.objectContaining({
          references: expect.any(Array),
        })
      );

      const dataViewReferences = sourceRuleMonitoringDashboard.references.filter(
        (r) => r.type === 'index-pattern' && r.id === 'kibana-event-log-data-view'
      );

      expect(dataViewReferences.length).toBeGreaterThan(1);
    });

    it('has references to the tags', () => {
      expect(sourceRuleMonitoringDashboard).toEqual(
        expect.objectContaining({
          references: expect.any(Array),
        })
      );

      const tagsReferences = sourceRuleMonitoringDashboard.references.filter(
        (r) => r.type === 'tag'
      );

      expect(tagsReferences).toEqual([
        {
          id: 'fleet-managed-<spaceId>',
          name: 'tag-ref-fleet-managed',
          type: 'tag',
        },
        {
          id: 'security-solution-<spaceId>',
          name: 'tag-ref-security-solution',
          type: 'tag',
        },
      ]);
    });
  });

  describe('Data view: ".kibana-event-log-*"', () => {
    it('has correct type and id', () => {
      expect(sourceKibanaEventLogDataView).toEqual(
        expect.objectContaining({
          type: 'index-pattern',
          id: 'kibana-event-log-data-view',
        })
      );
    });

    it('is marked as managed', () => {
      expect(sourceKibanaEventLogDataView).toEqual(
        expect.objectContaining({
          managed: true,
        })
      );
    });

    it('has "coreMigrationVersion" and "typeMigrationVersion" fields', () => {
      expect(sourceKibanaEventLogDataView).toEqual(
        expect.objectContaining({
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
        })
      );
    });

    it('has correct and minimal attributes', () => {
      expect(sourceKibanaEventLogDataView).toEqual(
        expect.objectContaining({
          attributes: {
            // We don't specify any concrete fields and their formatting for this data view
            name: '.kibana-event-log-*',
            title: '.kibana-event-log-*',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
        })
      );
    });

    it('has no references', () => {
      expect(sourceKibanaEventLogDataView).toEqual(
        expect.objectContaining({
          references: expect.any(Array),
        })
      );

      expect(sourceKibanaEventLogDataView.references.length).toEqual(0);
    });
  });

  describe('Tag: "Managed"', () => {
    it('has correct type and id', () => {
      expect(sourceManagedTag).toEqual(
        expect.objectContaining({
          type: 'tag',
          id: 'fleet-managed-<spaceId>',
        })
      );
    });

    it('is marked as managed', () => {
      expect(sourceManagedTag).toEqual(
        expect.objectContaining({
          managed: true,
        })
      );
    });

    it('has "coreMigrationVersion" and "typeMigrationVersion" fields', () => {
      expect(sourceManagedTag).toEqual(
        expect.objectContaining({
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
        })
      );
    });

    it('has correct attributes', () => {
      expect(sourceManagedTag).toEqual(
        expect.objectContaining({
          attributes: expect.objectContaining({
            name: 'Managed',
          }),
        })
      );
    });

    it('has no references', () => {
      expect(sourceManagedTag).toEqual(
        expect.objectContaining({
          references: expect.any(Array),
        })
      );

      expect(sourceManagedTag.references.length).toEqual(0);
    });
  });

  describe('Tag: "Security Solution"', () => {
    it('has correct type and id', () => {
      expect(sourceSecuritySolutionTag).toEqual(
        expect.objectContaining({
          type: 'tag',
          id: 'security-solution-<spaceId>',
        })
      );
    });

    it('is marked as managed', () => {
      expect(sourceSecuritySolutionTag).toEqual(
        expect.objectContaining({
          managed: true,
        })
      );
    });

    it('has "coreMigrationVersion" and "typeMigrationVersion" fields', () => {
      expect(sourceSecuritySolutionTag).toEqual(
        expect.objectContaining({
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
        })
      );
    });

    it('has correct attributes', () => {
      expect(sourceSecuritySolutionTag).toEqual(
        expect.objectContaining({
          attributes: expect.objectContaining({
            name: 'Security Solution',
          }),
        })
      );
    });

    it('has no references', () => {
      expect(sourceSecuritySolutionTag).toEqual(
        expect.objectContaining({
          references: expect.any(Array),
        })
      );

      expect(sourceSecuritySolutionTag.references.length).toEqual(0);
    });
  });
});
