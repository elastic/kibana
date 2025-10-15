/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSupportedSchemas } from './supported_schemas';
import type { ExperimentalFeatures } from '../../../../../../common';
import * as securityModules from './security_modules';

const actualSecurityModules = jest.requireActual('./security_modules');

jest.mock('./security_modules', () => ({
  ...jest.requireActual('./security_modules'),
  getSecurityModuleDatasets: jest.fn(),
  getAllSecurityModules: jest.fn(),
}));

const mockGetSecurityModuleDatasets =
  securityModules.getSecurityModuleDatasets as jest.MockedFunction<
    typeof securityModules.getSecurityModuleDatasets
  >;

describe('getSupportedSchemas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecurityModuleDatasets.mockImplementation(
      actualSecurityModules.getSecurityModuleDatasets
    );
  });
  describe('Microsoft Defender for Endpoint integration', () => {
    it('should include Microsoft Defender datasets when feature flag is enabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: true,
      } as ExperimentalFeatures;

      const schemas = getSupportedSchemas(experimentalFeatures);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();
      expect(filebeatSchema!.constraints).toEqual(
        expect.arrayContaining([
          {
            field: 'event.dataset',
            value: expect.arrayContaining([
              'microsoft_defender_endpoint.log',
              'm365_defender.alert',
              'm365_defender.incident',
            ]),
          },
        ])
      );
    });

    it('should not include Microsoft Defender datasets when feature flag is disabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: false,
      } as ExperimentalFeatures;

      const schemas = getSupportedSchemas(experimentalFeatures);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();

      // Get the event.dataset constraint
      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      expect(datasetConstraint).toBeDefined();
      expect(datasetConstraint!.value).not.toEqual(
        expect.arrayContaining([
          'microsoft_defender_endpoint.log',
          'm365_defender.alert',
          'm365_defender.incident',
        ])
      );
    });

    it('should not include Microsoft Defender datasets when experimentalFeatures is undefined', () => {
      const schemas = getSupportedSchemas(undefined);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();

      // Get the event.dataset constraint
      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      expect(datasetConstraint).toBeDefined();
      expect(datasetConstraint!.value).not.toEqual(
        expect.arrayContaining([
          'microsoft_defender_endpoint.log',
          'm365_defender.alert',
          'm365_defender.incident',
        ])
      );
    });

    it('should always include standard third-party datasets', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: false,
      } as ExperimentalFeatures;

      const schemas = getSupportedSchemas(experimentalFeatures);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();

      // Get the event.dataset constraint
      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      expect(datasetConstraint).toBeDefined();
      expect(datasetConstraint!.value).toEqual(
        expect.arrayContaining([
          'sentinel_one_cloud_funnel.event',
          'sentinel_one.alert',
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'jamf_protect.telemetry',
          'jamf_protect.alerts',
          'jamf_protect.web-threat-events',
          'jamf_protect.web-traffic-events',
        ])
      );
    });
  });

  describe('schema structure', () => {
    it('should return correct schema structure for endpoint', () => {
      const schemas = getSupportedSchemas(undefined);
      const endpointSchema = schemas.find((schema) => schema.name === 'endpoint');

      expect(endpointSchema).toEqual({
        name: 'endpoint',
        constraints: [
          {
            field: 'agent.type',
            value: 'endpoint',
          },
        ],
        schema: {
          id: 'process.entity_id',
          parent: 'process.parent.entity_id',
          ancestry: 'process.Ext.ancestry',
          name: 'process.name',
          agentId: 'agent.id',
        },
      });
    });

    it('should return correct schema structure for winlogbeat', () => {
      const schemas = getSupportedSchemas(undefined);
      const winlogbeatSchema = schemas.find((schema) => schema.name === 'winlogbeat');

      expect(winlogbeatSchema).toEqual({
        name: 'winlogbeat',
        constraints: [
          {
            field: 'agent.type',
            value: 'winlogbeat',
          },
          {
            field: 'event.module',
            value: 'sysmon',
          },
        ],
        schema: {
          id: 'process.entity_id',
          parent: 'process.parent.entity_id',
          name: 'process.name',
        },
      });
    });

    it('should return correct schema structure for sysmonViaFilebeat', () => {
      const schemas = getSupportedSchemas(undefined);
      const sysmonSchema = schemas.find((schema) => schema.name === 'sysmonViaFilebeat');

      expect(sysmonSchema).toEqual({
        name: 'sysmonViaFilebeat',
        constraints: [
          {
            field: 'agent.type',
            value: 'filebeat',
          },
          {
            field: 'event.dataset',
            value: 'windows.sysmon_operational',
          },
        ],
        schema: {
          id: 'process.entity_id',
          parent: 'process.parent.entity_id',
          name: 'process.name',
        },
      });
    });

    it('should include process.name field in all schemas', () => {
      const schemas = getSupportedSchemas(undefined);

      schemas.forEach((schemaConfig) => {
        expect(schemaConfig.schema.name).toBe('process.name');
      });
    });
  });

  describe('Microsoft Defender datasets integration', () => {
    it('should include all three Microsoft Defender datasets when enabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: true,
      } as ExperimentalFeatures;

      const schemas = getSupportedSchemas(experimentalFeatures);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      const datasets = datasetConstraint!.value as string[];

      expect(datasets).toContain('microsoft_defender_endpoint.log');
      expect(datasets).toContain('m365_defender.alert');
      expect(datasets).toContain('m365_defender.incident');
    });

    it('should maintain existing third-party integrations when Microsoft Defender is enabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: true,
      } as ExperimentalFeatures;

      const schemas = getSupportedSchemas(experimentalFeatures);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      const datasets = datasetConstraint!.value as string[];

      // Verify all existing integrations are still present
      const expectedDatasets = [
        'sentinel_one_cloud_funnel.event',
        'sentinel_one.alert',
        'crowdstrike.alert',
        'crowdstrike.falcon',
        'crowdstrike.fdr',
        'jamf_protect.telemetry',
        'jamf_protect.alerts',
        'jamf_protect.web-threat-events',
        'jamf_protect.web-traffic-events',
        'microsoft_defender_endpoint.log',
        'm365_defender.alert',
        'm365_defender.incident',
      ];

      expectedDatasets.forEach((dataset) => {
        expect(datasets).toContain(dataset);
      });
    });
  });

  describe('centralized security module integration', () => {
    it('should call getSecurityModuleDatasets with core modules when feature flag is disabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: false,
      } as ExperimentalFeatures;

      getSupportedSchemas(experimentalFeatures);

      expect(mockGetSecurityModuleDatasets).toHaveBeenCalledWith([
        'crowdstrike',
        'jamf_protect',
        'sentinel_one',
        'sentinel_one_cloud_funnel',
      ]);
    });

    it('should call getSecurityModuleDatasets with all modules when feature flag is enabled', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        microsoftDefenderEndpointDataInAnalyzerEnabled: true,
      } as ExperimentalFeatures;

      getSupportedSchemas(experimentalFeatures);

      expect(mockGetSecurityModuleDatasets).toHaveBeenCalledWith([
        'crowdstrike',
        'jamf_protect',
        'sentinel_one',
        'sentinel_one_cloud_funnel',
        'microsoft_defender_endpoint',
        'm365_defender',
      ]);
    });

    it('should call getSecurityModuleDatasets with core modules when experimentalFeatures is undefined', () => {
      getSupportedSchemas(undefined);

      expect(mockGetSecurityModuleDatasets).toHaveBeenCalledWith([
        'crowdstrike',
        'jamf_protect',
        'sentinel_one',
        'sentinel_one_cloud_funnel',
      ]);
    });

    it('should use datasets returned by getSecurityModuleDatasets in filebeat schema constraint', () => {
      const mockDatasets = ['custom.dataset1', 'custom.dataset2'];
      mockGetSecurityModuleDatasets.mockReturnValue(mockDatasets);

      const schemas = getSupportedSchemas(undefined);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();
      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      expect(datasetConstraint).toBeDefined();
      expect(datasetConstraint!.value).toEqual(mockDatasets);
    });

    it('should handle empty datasets from getSecurityModuleDatasets', () => {
      mockGetSecurityModuleDatasets.mockReturnValue([]);

      const schemas = getSupportedSchemas(undefined);
      const filebeatSchema = schemas.find((schema) => schema.name === 'filebeat');

      expect(filebeatSchema).toBeDefined();
      const datasetConstraint = filebeatSchema!.constraints.find(
        (constraint) => constraint.field === 'event.dataset'
      );

      expect(datasetConstraint).toBeDefined();
      expect(datasetConstraint!.value).toEqual([]);
    });

    it('should call getSecurityModuleDatasets exactly once per getSupportedSchemas call', () => {
      getSupportedSchemas(undefined);

      expect(mockGetSecurityModuleDatasets).toHaveBeenCalledTimes(1);

      getSupportedSchemas({
        microsoftDefenderEndpointDataInAnalyzerEnabled: true,
      } as ExperimentalFeatures);

      expect(mockGetSecurityModuleDatasets).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle getSecurityModuleDatasets throwing an error', () => {
      mockGetSecurityModuleDatasets.mockImplementation(() => {
        throw new Error('Security module datasets error');
      });

      expect(() => getSupportedSchemas(undefined)).toThrow('Security module datasets error');
    });
  });
});
