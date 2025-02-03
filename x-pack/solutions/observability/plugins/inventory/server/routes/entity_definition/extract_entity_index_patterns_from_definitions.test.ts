/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySourceDefinition } from '@kbn/entityManager-plugin/server/lib/v2/types';
import { extractEntityIndexPatternsFromDefinitions } from './extract_entity_index_patterns_from_definitions';

describe('extractEntityIndexPatternsFromDefinitions', () => {
  it('should correctly extract index patterns for host entity types with single source', () => {
    const sourceDefinition: EntitySourceDefinition[] = [
      {
        id: 'built_in_hosts_from_ecs_data_ecs',
        type_id: 'built_in_hosts_from_ecs_data',
        index_patterns: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
    ];

    const result = extractEntityIndexPatternsFromDefinitions(sourceDefinition);

    expect(result).toEqual({
      built_in_hosts_from_ecs_data: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
    });
  });
  it('should correctly extract index patterns for service and host entity types with single source', () => {
    const sourceDefinition: EntitySourceDefinition[] = [
      {
        id: 'built_in_hosts_from_ecs_data_ecs',
        type_id: 'built_in_hosts_from_ecs_data',
        index_patterns: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_services_from_ecs_data_ecs',
        type_id: 'built_in_services_from_ecs_data',
        index_patterns: ['logs-*', 'filebeat*', 'traces-*'],
        identity_fields: ['service.name'],
        display_name: 'service.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
    ];

    const result = extractEntityIndexPatternsFromDefinitions(sourceDefinition);

    expect(result).toEqual({
      built_in_hosts_from_ecs_data: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
      built_in_services_from_ecs_data: ['logs-*', 'filebeat*', 'traces-*'],
    });
  });
  it('should correctly extract index patterns for service and host entity types with multiple sources', () => {
    const sourceDefinition: EntitySourceDefinition[] = [
      {
        id: 'built_in_hosts_from_ecs_data_ecs',
        type_id: 'built_in_hosts_from_ecs_data',
        index_patterns: ['metrics-*', 'metricbeat-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_hosts_from_ecs_data_ecs',
        type_id: 'built_in_hosts_from_ecs_data',
        index_patterns: ['filebeat-*', 'logs-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_services_from_ecs_data_ecs',
        type_id: 'built_in_services_from_ecs_data',
        index_patterns: ['logs-*'],
        identity_fields: ['service.name'],
        display_name: 'service.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_services_from_ecs_data_ecs',
        type_id: 'built_in_services_from_ecs_data',
        index_patterns: ['filebeat*', 'traces-*'],
        identity_fields: ['service.name'],
        display_name: 'service.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
    ];

    const result = extractEntityIndexPatternsFromDefinitions(sourceDefinition);

    expect(result).toEqual({
      built_in_hosts_from_ecs_data: ['metrics-*', 'metricbeat-*', 'filebeat-*', 'logs-*'],
      built_in_services_from_ecs_data: ['logs-*', 'filebeat*', 'traces-*'],
    });
  });
  it('should correctly extract index patterns for service and container entity types with multiple sources with duplicate patterns', () => {
    const sourceDefinition: EntitySourceDefinition[] = [
      {
        id: 'built_in_hosts_from_ecs_data_ecs',
        type_id: 'built_in_containers_from_ecs_data',
        index_patterns: ['metrics-*', 'logs-*', 'metricbeat-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_containers_from_ecs_data_ecs_new_source',
        type_id: 'built_in_containers_from_ecs_data',
        index_patterns: ['metrics-*', 'filebeat-*', 'logs-*', 'new-*'],
        identity_fields: ['host.name'],
        display_name: 'host.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_services_from_ecs_data_ecs',
        type_id: 'built_in_services_from_ecs_data',
        index_patterns: ['logs-*', 'filebeat*', 'new-*'],
        identity_fields: ['service.name'],
        display_name: 'service.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
      {
        id: 'built_in_services_from_ecs_data_ecs_new_source',
        type_id: 'built_in_services_from_ecs_data',
        index_patterns: ['logs-*', 'filebeat*', 'traces-*'],
        identity_fields: ['service.name'],
        display_name: 'service.name',
        timestamp_field: '@timestamp',
        metadata_fields: [],
        filters: [],
      },
    ];

    const result = extractEntityIndexPatternsFromDefinitions(sourceDefinition);

    expect(result).toEqual({
      built_in_services_from_ecs_data: ['logs-*', 'filebeat*', 'new-*', 'traces-*'],
      built_in_containers_from_ecs_data: [
        'metrics-*',
        'logs-*',
        'metricbeat-*',
        'filebeat-*',
        'new-*',
      ],
    });
  });
});
