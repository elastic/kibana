/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from '../domain/models';
import { generateEsqlSloWorkflowYaml } from './esql_workflow_template';

const createBaseSlo = (overrides = {}): any => ({
  id: 'test-slo-123',
  name: 'Test ESQL SLO',
  revision: 1,
  indicator: {
    type: 'sli.esql.custom',
    params: {
      esqlQuery:
        'FROM logs-* | STATS numerator = COUNT(*) WHERE status = 200, denominator = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m)',
    },
  },
  budgetingMethod: 'occurrences',
  groupBy: '*',
  objective: {
    target: 0.99,
  },
  settings: {
    frequency: new Duration(1, DurationUnit.Minute),
    syncDelay: new Duration(1, DurationUnit.Minute),
    preventInitialBackfill: false,
  },
  ...overrides,
});

describe('generateEsqlSloWorkflowYaml', () => {
  it('generates valid workflow YAML for ungrouped SLO', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('name: "SLO ESQL - Test ESQL SLO"');
    expect(yaml).toContain('type: scheduled');
    expect(yaml).toContain('every: "1m"');
    expect(yaml).toContain('key: "esql-sli-test-slo-123"');
    expect(yaml).toContain('strategy: drop');
    expect(yaml).toContain('max: 1');
    expect(yaml).toContain('type: elasticsearch.esql.query');
    expect(yaml).toContain('type: foreach');
    expect(yaml).toContain('pipeline=.slo-observability.sli.pipeline-test-slo-123-1');
  });

  it('uses deterministic _id: {timestamp}-{instanceId}', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    // For ungrouped, instanceId should be "*"
    expect(yaml).toContain('{{ item.@timestamp }}-*');
  });

  it('generates correct workflow for grouped SLO', () => {
    const slo = createBaseSlo({
      groupBy: ['host.name', 'region'],
      indicator: {
        type: 'sli.esql.custom',
        params: {
          esqlQuery:
            'FROM logs-* | STATS numerator = COUNT(*) WHERE status = 200, denominator = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m), host.name, region',
          groupBy: ['host.name', 'region'],
        },
      },
    });
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    // Grouped instanceId should be concatenation of group values
    expect(yaml).toContain('host.name');
    expect(yaml).toContain('region');
    expect(yaml).toContain('slo.groupings.host.name');
    expect(yaml).toContain('slo.groupings.region');
  });

  it('includes DSL time-range filter, not embedded in ESQL', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('filter:');
    expect(yaml).toContain('range:');
    expect(yaml).toContain('"@timestamp"');
    expect(yaml).toContain('gte: "now-6m"'); // 5 * 1m + 1m = 6m lookback
    expect(yaml).toContain('lt: "now-1m"'); // syncDelay = 1m
  });

  it('computes lookback correctly for different frequencies', () => {
    const slo = createBaseSlo({
      settings: {
        frequency: new Duration(5, DurationUnit.Minute),
        syncDelay: new Duration(2, DurationUnit.Minute),
        preventInitialBackfill: false,
      },
    });
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    // lookback = 5 * 5m + 2m = 27m
    expect(yaml).toContain('gte: "now-27m"');
    expect(yaml).toContain('lt: "now-2m"');
  });

  it('includes isGoodSlice computation for timeslices budgeting', () => {
    const slo = createBaseSlo({
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.99,
        timesliceTarget: 0.95,
        timesliceWindow: new Duration(5, DurationUnit.Minute),
      },
    });
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('slo.isGoodSlice');
  });

  it('includes early exit on empty results', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('check_empty_results');
    expect(yaml).toContain('early_exit');
    expect(yaml).toContain('size }} == 0');
  });

  it('includes error handling for ESQL query failure', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('on-failure:');
    expect(yaml).toContain('esql_query_failed');
  });

  it('includes error handling for per-document indexing failure', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('index_doc_failed');
  });

  it('uses correct workflow ID convention', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'default');

    expect(yaml).toContain('slo_id: "test-slo-123"');
    expect(yaml).toContain('slo_revision: 1');
  });

  it('handles non-default space', () => {
    const slo = createBaseSlo();
    const yaml = generateEsqlSloWorkflowYaml(slo, 'custom-space');

    expect(yaml).toContain('space_id: "custom-space"');
  });
});
