/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import {
  ThresholdDetails,
  ThreatMatchDetails,
  MachineLearningDetails,
  NewTermsDetails,
  EqlDetails,
  createRuleAttachmentDefinition,
} from './rule_attachment';
import { AiRuleCreationService } from '../../detection_engine/common/ai_rule_creation_store';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { RULES_FEATURE_LATEST } from '@kbn/security-solution-features/constants';

const baseRule = {
  name: 'Test Rule',
  description: 'A test rule',
  severity: 'high' as const,
  risk_score: 73,
  tags: ['test'],
  interval: '5m',
  from: 'now-6m',
  to: 'now',
};

const makeApplication = () =>
  ({
    capabilities: { [RULES_FEATURE_LATEST]: { edit_rules: true } },
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart);

const renderInlineContent = (rule: Record<string, unknown>) => {
  const aiRuleCreation = new AiRuleCreationService();
  const application = makeApplication();
  const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
  const Renderer = definition.renderInlineContent!;
  return render(
    <Renderer
      attachment={{
        id: 'test',
        type: 'security.rule',
        data: { text: JSON.stringify(rule) },
      }}
      isSidebar={false}
      isCanvas={false}
      updateOrigin={jest.fn()}
    />
  );
};

describe('ThresholdDetails', () => {
  it('renders threshold with a single field using the reused Threshold component', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.getByText('Threshold')).toBeInTheDocument();
    expect(screen.getByText(/Results aggregated by/)).toBeInTheDocument();
    expect(screen.getByText(/source\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/>= 5/)).toBeInTheDocument();
  });

  it('renders threshold with multiple fields as comma-separated list', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: ['source.ip', 'destination.ip'], value: 10 },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.getByText(/source\.ip,destination\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/>= 10/)).toBeInTheDocument();
  });

  it('renders cardinality when present', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: {
        field: 'source.ip',
        value: 5,
        cardinality: [{ field: 'user.name', value: 3 }],
      },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.getByText(/unique values count of user\.name >= 3/)).toBeInTheDocument();
  });

  it('renders "All results" when threshold field is empty', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: '', value: 100 },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.getByText(/All results/)).toBeInTheDocument();
    expect(screen.getByText(/>= 100/)).toBeInTheDocument();
  });

  it('renders threshold with empty array field as "All results"', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: [''], value: 50 },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.getByText(/All results/)).toBeInTheDocument();
    expect(screen.getByText(/>= 50/)).toBeInTheDocument();
  });

  it('does not render cardinality when empty array', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5, cardinality: [] },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.queryByText(/unique values count/)).not.toBeInTheDocument();
  });

  it('does not render cardinality when undefined', () => {
    const rule = {
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
    } as unknown as RuleResponse;

    render(<ThresholdDetails rule={rule} />);

    expect(screen.queryByText(/unique values count/)).not.toBeInTheDocument();
  });

  it('returns null for non-threshold rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<ThresholdDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('ThreatMatchDetails', () => {
  it('renders threat index badges via reused ThreatIndex component', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*', 'logs-ti*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.getByText('Indicator index patterns')).toBeInTheDocument();
    expect(screen.getByText('filebeat-*')).toBeInTheDocument();
    expect(screen.getByText('logs-ti*')).toBeInTheDocument();
  });

  it('renders threat query in code block', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*'],
      threat_query: 'threat.indicator.type: "ip"',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.getByText('Indicator index query')).toBeInTheDocument();
    expect(screen.getByText('threat.indicator.type: "ip"')).toBeInTheDocument();
  });

  it('renders threat mapping using MATCHES format from constructThreatMappingDescription', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.getByText('Indicator mapping')).toBeInTheDocument();
    expect(screen.getByText(/source\.ip MATCHES threat\.indicator\.ip/)).toBeInTheDocument();
  });

  it('renders multiple entries within one mapping group with AND', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        {
          entries: [
            { field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' },
            { field: 'destination.port', type: 'mapping', value: 'threat.indicator.port' },
          ],
        },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.getByText(/source\.ip MATCHES threat\.indicator\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/AND/)).toBeInTheDocument();
    expect(
      screen.getByText(/destination\.port MATCHES threat\.indicator\.port/)
    ).toBeInTheDocument();
  });

  it('renders multiple threat mapping groups with OR', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
        {
          entries: [{ field: 'host.name', type: 'mapping', value: 'threat.indicator.hostname' }],
        },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.getByText(/source\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/OR/)).toBeInTheDocument();
    expect(screen.getByText(/host\.name/)).toBeInTheDocument();
  });

  it('does not render threat query section when threat_query is empty string', () => {
    const rule = {
      ...baseRule,
      type: 'threat_match',
      query: 'host.name: *',
      threat_index: ['filebeat-*'],
      threat_query: '',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    } as unknown as RuleResponse;

    render(<ThreatMatchDetails rule={rule} />);

    expect(screen.queryByText('Indicator index query')).not.toBeInTheDocument();
  });

  it('returns null for non-threat_match rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<ThreatMatchDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('MachineLearningDetails', () => {
  it('renders a single ML job ID as badge', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'v3_linux_anomalous_network_activity',
      anomaly_threshold: 75,
    } as unknown as RuleResponse;

    render(<MachineLearningDetails rule={rule} />);

    expect(screen.getByText('Machine Learning job')).toBeInTheDocument();
    expect(screen.getByText('v3_linux_anomalous_network_activity')).toBeInTheDocument();
  });

  it('renders anomaly threshold via reused AnomalyThreshold component', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'my_job',
      anomaly_threshold: 75,
    } as unknown as RuleResponse;

    render(<MachineLearningDetails rule={rule} />);

    expect(screen.getByText('Anomaly score threshold')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders multiple ML job IDs as badges', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: ['job_one', 'job_two', 'job_three'],
      anomaly_threshold: 50,
    } as unknown as RuleResponse;

    render(<MachineLearningDetails rule={rule} />);

    expect(screen.getByText('job_one')).toBeInTheDocument();
    expect(screen.getByText('job_two')).toBeInTheDocument();
    expect(screen.getByText('job_three')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders anomaly threshold of 0', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'my_job',
      anomaly_threshold: 0,
    } as unknown as RuleResponse;

    render(<MachineLearningDetails rule={rule} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('returns null for non-machine_learning rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<MachineLearningDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('NewTermsDetails', () => {
  it('renders new terms fields via reused NewTermsFields component', () => {
    const rule = {
      ...baseRule,
      type: 'new_terms',
      query: 'host.name: *',
      new_terms_fields: ['host.name'],
      history_window_start: 'now-7d',
    } as unknown as RuleResponse;

    render(<NewTermsDetails rule={rule} />);

    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('host.name')).toBeInTheDocument();
  });

  it('renders history window via reused HistoryWindowSize (date math converted to duration)', () => {
    const rule = {
      ...baseRule,
      type: 'new_terms',
      query: 'host.name: *',
      new_terms_fields: ['host.name'],
      history_window_start: 'now-7d',
    } as unknown as RuleResponse;

    render(<NewTermsDetails rule={rule} />);

    expect(screen.getByText('History Window Size')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('renders multiple new terms fields', () => {
    const rule = {
      ...baseRule,
      type: 'new_terms',
      query: 'host.name: *',
      new_terms_fields: ['host.name', 'user.name', 'process.name'],
      history_window_start: 'now-30d',
    } as unknown as RuleResponse;

    render(<NewTermsDetails rule={rule} />);

    expect(screen.getByText('host.name')).toBeInTheDocument();
    expect(screen.getByText('user.name')).toBeInTheDocument();
    expect(screen.getByText('process.name')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('renders a single field with short window', () => {
    const rule = {
      ...baseRule,
      type: 'new_terms',
      query: '*:*',
      new_terms_fields: ['source.ip'],
      history_window_start: 'now-1d',
    } as unknown as RuleResponse;

    render(<NewTermsDetails rule={rule} />);

    expect(screen.getByText('source.ip')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
  });

  it('returns null for non-new_terms rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<NewTermsDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('EqlDetails', () => {
  it('renders all three EQL-specific fields using shared translation labels', () => {
    const rule = {
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
      event_category_override: 'event.category',
      tiebreaker_field: 'event.sequence',
      timestamp_field: '@timestamp',
    } as unknown as RuleResponse;

    render(<EqlDetails rule={rule} />);

    expect(screen.getByText(/Event category field/)).toBeInTheDocument();
    expect(screen.getByText('event.category')).toBeInTheDocument();
    expect(screen.getByText(/Tiebreaker field/)).toBeInTheDocument();
    expect(screen.getByText('event.sequence')).toBeInTheDocument();
    expect(screen.getByText(/Timestamp field/)).toBeInTheDocument();
    expect(screen.getByText('@timestamp')).toBeInTheDocument();
  });

  it('renders only event_category_override when others are absent', () => {
    const rule = {
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
      event_category_override: 'event.category',
    } as unknown as RuleResponse;

    render(<EqlDetails rule={rule} />);

    expect(screen.getByText('event.category')).toBeInTheDocument();
    expect(screen.queryByText(/Tiebreaker field/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Timestamp field/)).not.toBeInTheDocument();
  });

  it('renders only tiebreaker_field when others are absent', () => {
    const rule = {
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
      tiebreaker_field: 'event.sequence',
    } as unknown as RuleResponse;

    render(<EqlDetails rule={rule} />);

    expect(screen.getByText('event.sequence')).toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Timestamp field/)).not.toBeInTheDocument();
  });

  it('renders only timestamp_field when others are absent', () => {
    const rule = {
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
      timestamp_field: 'event.created',
    } as unknown as RuleResponse;

    render(<EqlDetails rule={rule} />);

    expect(screen.getByText('event.created')).toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tiebreaker field/)).not.toBeInTheDocument();
  });

  it('returns null when no EQL-specific fields are present', () => {
    const rule = {
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
    } as unknown as RuleResponse;

    const { container } = render(<EqlDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null for non-eql rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<EqlDetails rule={rule} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('RuleInlineContent integration', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as { location?: Location }).location;
    (window as { location: unknown }).location = { pathname: '/' };
  });

  afterAll(() => {
    (window as { location: unknown }).location = originalLocation;
  });

  it('renders threshold rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
    });

    expect(screen.getAllByText('Threshold')).toHaveLength(2);
    expect(screen.getByText(/source\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/>= 5/)).toBeInTheDocument();
  });

  it('renders threat_match rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'threat_match',
      query: '*:*',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    });

    expect(screen.getByText('Indicator Match')).toBeInTheDocument();
    expect(screen.getByText('Indicator index patterns')).toBeInTheDocument();
    expect(screen.getByText('filebeat-*')).toBeInTheDocument();
    expect(screen.getByText(/source\.ip MATCHES threat\.indicator\.ip/)).toBeInTheDocument();
  });

  it('renders machine_learning rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'v3_linux_anomalous_network_activity',
      anomaly_threshold: 75,
    });

    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning job')).toBeInTheDocument();
    expect(screen.getByText('v3_linux_anomalous_network_activity')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders new_terms rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'new_terms',
      query: '*:*',
      new_terms_fields: ['host.name'],
      history_window_start: 'now-7d',
    });

    expect(screen.getByText('New Terms')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('host.name')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('renders eql rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
      event_category_override: 'event.category',
      tiebreaker_field: 'event.sequence',
    });

    expect(screen.getByText('EQL')).toBeInTheDocument();
    expect(screen.getByText(/Event category field/)).toBeInTheDocument();
    expect(screen.getByText('event.category')).toBeInTheDocument();
    expect(screen.getByText('event.sequence')).toBeInTheDocument();
  });

  it('does not render type-specific section for eql rule without optional fields', () => {
    renderInlineContent({
      ...baseRule,
      type: 'eql',
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
    });

    expect(screen.getByText('EQL')).toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
  });

  it('does not render type-specific section for basic query rule', () => {
    renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.queryByText('Indicator index patterns')).not.toBeInTheDocument();
    expect(screen.queryByText('Machine Learning job')).not.toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
  });

  it('does not render type-specific section for esql rule', () => {
    renderInlineContent({
      ...baseRule,
      type: 'esql',
      query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
      language: 'esql',
    });

    expect(screen.queryByText('Indicator index patterns')).not.toBeInTheDocument();
    expect(screen.queryByText('Machine Learning job')).not.toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
  });

  it('does not render type-specific section for saved_query rule', () => {
    renderInlineContent({
      ...baseRule,
      type: 'saved_query',
      saved_id: 'my-saved-query',
    });

    expect(screen.getByText('Saved Query')).toBeInTheDocument();
    expect(screen.queryByText('Indicator index patterns')).not.toBeInTheDocument();
    expect(screen.queryByText('Machine Learning job')).not.toBeInTheDocument();
  });

  it('renders type-specific section between query and tags for threshold rule', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
      tags: ['my-tag'],
    });

    const allText = container.textContent ?? '';
    const queryPos = allText.indexOf('host.name: *');
    const thresholdPos = allText.indexOf('Results aggregated by');
    const tagsPos = allText.indexOf('Tags');

    expect(queryPos).toBeLessThan(thresholdPos);
    expect(thresholdPos).toBeLessThan(tagsPos);
  });

  it('renders type-specific section between index patterns and tags for ml rule', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'my_job',
      anomaly_threshold: 50,
      tags: ['ml-tag'],
    });

    const allText = container.textContent ?? '';
    const mlPos = allText.indexOf('Machine Learning job');
    const tagsPos = allText.indexOf('Tags');

    expect(mlPos).toBeLessThan(tagsPos);
  });

  it('renders shared fields alongside type-specific fields', () => {
    renderInlineContent({
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
      index: ['logs-*'],
      tags: ['test-tag'],
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A test rule')).toBeInTheDocument();
    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.getByText(/Results aggregated by/)).toBeInTheDocument();
    expect(screen.getByText('test-tag')).toBeInTheDocument();
    expect(screen.getByText('Severity:')).toBeInTheDocument();
    expect(screen.getByText('Risk Score:')).toBeInTheDocument();
  });

  it('renders empty rule content for invalid JSON', () => {
    const aiRuleCreation = new AiRuleCreationService();
    const application = makeApplication();
    const definition = createRuleAttachmentDefinition({ application, aiRuleCreation });
    const Renderer = definition.renderInlineContent!;
    render(
      <Renderer
        attachment={{
          id: 'test',
          type: 'security.rule',
          data: { text: 'not-valid-json' },
        }}
        isSidebar={false}
        isCanvas={false}
        updateOrigin={jest.fn()}
      />
    );

    expect(screen.getByText('New Rule')).toBeInTheDocument();
  });

  it('renders empty rule content for rule without name', () => {
    renderInlineContent({ type: 'query', query: '*:*' });

    expect(screen.getByText('New Rule')).toBeInTheDocument();
  });
});
