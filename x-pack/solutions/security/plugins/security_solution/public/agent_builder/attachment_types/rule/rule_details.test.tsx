/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  ThresholdDetails,
  ThreatMatchDetails,
  MachineLearningDetails,
  NewTermsDetails,
  SavedQueryDetails,
  EqlDetails,
} from './rule_type_details';
import { FiltersDisplay, getFilterLabel } from './filters_display';
import { createRuleAttachmentDefinition } from './rule_attachment';
import type { Filter } from '@kbn/es-query';
import { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
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

    const { container } = render(<ThresholdDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Threshold');
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

    const { container } = render(<ThreatMatchDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Indicator index patterns');
    expect(text).toContain('filebeat-*');
    expect(text).toContain('logs-ti*');
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

    const { container } = render(<ThreatMatchDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Indicator mapping');
    expect(text).toContain('source.ip MATCHES threat.indicator.ip');
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
  it('renders a single ML job ID', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'v3_linux_anomalous_network_activity',
      anomaly_threshold: 75,
    } as unknown as RuleResponse;

    const { container } = render(<MachineLearningDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Machine Learning job');
    expect(text).toContain('v3_linux_anomalous_network_activity');
  });

  it('renders anomaly threshold', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'my_job',
      anomaly_threshold: 75,
    } as unknown as RuleResponse;

    const { container } = render(<MachineLearningDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Anomaly score threshold');
    expect(text).toContain('75');
  });

  it('renders multiple ML job IDs as comma-separated list', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: ['job_one', 'job_two', 'job_three'],
      anomaly_threshold: 50,
    } as unknown as RuleResponse;

    const { container } = render(<MachineLearningDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('job_one, job_two, job_three');
    expect(text).toContain('50');
  });

  it('renders anomaly threshold of 0', () => {
    const rule = {
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'my_job',
      anomaly_threshold: 0,
    } as unknown as RuleResponse;

    const { container } = render(<MachineLearningDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Anomaly score threshold');
    expect(text).toContain('0');
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

    const { container } = render(<NewTermsDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Fields');
    expect(text).toContain('host.name');
  });

  it('renders history window size with date math converted to duration', () => {
    const rule = {
      ...baseRule,
      type: 'new_terms',
      query: 'host.name: *',
      new_terms_fields: ['host.name'],
      history_window_start: 'now-7d',
    } as unknown as RuleResponse;

    const { container } = render(<NewTermsDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('History Window Size');
    expect(text).toContain('7d');
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

describe('SavedQueryDetails', () => {
  it('renders saved query name', () => {
    const rule = {
      ...baseRule,
      type: 'saved_query',
      saved_id: 'my-saved-query-id',
    } as unknown as RuleResponse;

    const { container } = render(<SavedQueryDetails rule={rule} />);
    const text = container.textContent ?? '';

    expect(text).toContain('Saved query name');
    expect(text).toContain('my-saved-query-id');
  });

  it('returns null for non-saved_query rule types', () => {
    const rule = {
      ...baseRule,
      type: 'query',
    } as unknown as RuleResponse;

    const { container } = render(<SavedQueryDetails rule={rule} />);

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

describe('getFilterLabel', () => {
  it('returns alias when present', () => {
    const filter: Filter = { meta: { alias: 'My custom filter' } };
    expect(getFilterLabel(filter)).toBe('My custom filter');
  });

  it('formats phrase filter as key: value', () => {
    const filter: Filter = {
      meta: { key: 'host.name', type: 'phrase', value: 'server-01' },
    };
    expect(getFilterLabel(filter)).toBe('host.name: server-01');
  });

  it('formats phrases filter with comma-separated params', () => {
    const filter: Filter = {
      meta: { key: 'status', type: 'phrases', params: ['active', 'pending', 'error'] },
    };
    expect(getFilterLabel(filter)).toBe('status: active, pending, error');
  });

  it('formats exists filter', () => {
    const filter: Filter = { meta: { key: 'agent.name', type: 'exists' } };
    expect(getFilterLabel(filter)).toBe('agent.name: exists');
  });

  it('formats negated filter with NOT prefix', () => {
    const filter: Filter = {
      meta: { key: 'host.name', negate: true, type: 'phrase', value: 'bad-host' },
    };
    expect(getFilterLabel(filter)).toBe('NOT host.name: bad-host');
  });

  it('formats range filter with gte and lte', () => {
    const filter: Filter = {
      meta: { key: 'bytes', type: 'range', params: { gte: 100, lte: 500 } },
    };
    expect(getFilterLabel(filter)).toBe('bytes: >= 100 AND <= 500');
  });

  it('formats range filter with only gte', () => {
    const filter: Filter = {
      meta: { key: 'risk_score', type: 'range', params: { gte: 50 } },
    };
    expect(getFilterLabel(filter)).toBe('risk_score: >= 50');
  });

  it('formats range filter with strict gt and lt', () => {
    const filter: Filter = {
      meta: { key: 'bytes', type: 'range', params: { gt: 100, lt: 500 } },
    };
    expect(getFilterLabel(filter)).toBe('bytes: > 100 AND < 500');
  });

  it('formats range filter with strict gt only', () => {
    const filter: Filter = {
      meta: { key: 'risk_score', type: 'range', params: { gt: 50 } },
    };
    expect(getFilterLabel(filter)).toBe('risk_score: > 50');
  });

  it('prefers gte over gt when both present', () => {
    const filter: Filter = {
      meta: { key: 'bytes', type: 'range', params: { gte: 100, gt: 99 } },
    };
    expect(getFilterLabel(filter)).toBe('bytes: >= 100');
  });

  it('falls back to JSON for filter without key', () => {
    const filter: Filter = { meta: {}, query: { match_all: {} } };
    expect(getFilterLabel(filter)).toBe('{"match_all":{}}');
  });

  it('formats negated exists filter', () => {
    const filter: Filter = { meta: { key: 'error.message', type: 'exists', negate: true } };
    expect(getFilterLabel(filter)).toBe('NOT error.message: exists');
  });

  it('shows key only when no value or params', () => {
    const filter: Filter = { meta: { key: 'event.action', type: 'custom' } };
    expect(getFilterLabel(filter)).toBe('event.action');
  });

  it('resolves phrase filter with params as { query: value } object', () => {
    const filter: Filter = {
      meta: { key: 'event.category', type: 'phrase', params: { query: 'network' } },
      query: { match_phrase: { 'event.category': 'network' } },
    };
    expect(getFilterLabel(filter)).toBe('event.category: network');
  });

  it('resolves non-typed filter with params as { query: value } object', () => {
    const filter: Filter = {
      meta: { key: 'host.os', params: { query: 'linux' } },
    };
    expect(getFilterLabel(filter)).toBe('host.os: linux');
  });
});

describe('FiltersDisplay', () => {
  it('renders filters as badges', () => {
    const filters = [
      { meta: { key: 'host.name', type: 'phrase', value: 'server-01' } },
      { meta: { key: 'agent.type', type: 'exists' } },
    ];

    render(<FiltersDisplay filters={filters} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('host.name: server-01')).toBeInTheDocument();
    expect(screen.getByText('agent.type: exists')).toBeInTheDocument();
  });

  it('renders negated filters with danger color', () => {
    const filters = [
      { meta: { key: 'host.name', negate: true, type: 'phrase', value: 'bad-host' } },
    ];

    const { container } = render(<FiltersDisplay filters={filters} />);

    expect(screen.getByText('NOT host.name: bad-host')).toBeInTheDocument();
    const badge = container.querySelector('.euiBadge');
    expect(badge).toBeInTheDocument();
  });

  it('renders nothing when filters array is empty', () => {
    const { container } = render(<FiltersDisplay filters={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('skips invalid filter objects without meta', () => {
    const filters = [{ something: 'else' }, null, undefined, { meta: { key: 'valid' } }];

    render(<FiltersDisplay filters={filters as unknown[]} />);

    expect(screen.getByText('valid')).toBeInTheDocument();
  });

  it('renders filter with alias', () => {
    const filters = [{ meta: { alias: 'Production servers only', key: 'env' } }];

    render(<FiltersDisplay filters={filters} />);

    expect(screen.getByText('Production servers only')).toBeInTheDocument();
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

  it('renders rule type label', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'threat_match',
      query: '*:*',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    });

    const allText = container.textContent ?? '';
    expect(allText).toContain('Rule type');
    expect(allText).toContain('Indicator Match');
  });

  it('renders description section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A test rule')).toBeInTheDocument();
  });

  it('renders severity and risk score', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    expect(screen.getByText('Severity:')).toBeInTheDocument();
    expect(screen.getByText('Risk Score:')).toBeInTheDocument();
    const allText = container.textContent ?? '';
    expect(allText).toContain('High');
    expect(allText).toContain('73');
  });

  it('renders interval and lookback time', () => {
    renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    expect(screen.getByText('Interval:')).toBeInTheDocument();
    expect(screen.getByText(/5m/)).toBeInTheDocument();
    expect(screen.getByText('Lookback time:')).toBeInTheDocument();
  });

  it('renders threshold rule with type-specific section', () => {
    renderInlineContent({
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      threshold: { field: 'source.ip', value: 5 },
    });

    expect(screen.getByText('Custom query')).toBeInTheDocument();
    expect(screen.getAllByText('Threshold').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/source\.ip/)).toBeInTheDocument();
    expect(screen.getByText(/>= 5/)).toBeInTheDocument();
  });

  it('renders threat_match rule with type-specific section', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'threat_match',
      query: '*:*',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
    });

    const allText = container.textContent ?? '';
    expect(screen.getByText('Custom query')).toBeInTheDocument();
    expect(allText).toContain('Indicator index patterns');
    expect(allText).toContain('filebeat-*');
    expect(allText).toContain('source.ip MATCHES threat.indicator.ip');
  });

  it('renders machine_learning rule with type-specific section', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'machine_learning',
      machine_learning_job_id: 'v3_linux_anomalous_network_activity',
      anomaly_threshold: 75,
    });

    const allText = container.textContent ?? '';
    expect(allText).toContain('Machine Learning job');
    expect(allText).toContain('v3_linux_anomalous_network_activity');
    expect(allText).toContain('75');
  });

  it('renders new_terms rule with type-specific section', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'new_terms',
      query: '*:*',
      new_terms_fields: ['host.name'],
      history_window_start: 'now-7d',
    });

    const allText = container.textContent ?? '';
    expect(screen.getByText('Custom query')).toBeInTheDocument();
    expect(allText).toContain('Fields');
    expect(allText).toContain('host.name');
    expect(allText).toContain('7d');
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

    expect(screen.getByText('EQL query')).toBeInTheDocument();
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

    expect(screen.getByText('EQL query')).toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
  });

  it('does not render type-specific section for basic query rule', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    const allText = container.textContent ?? '';
    expect(allText).toContain('Custom query');
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

    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.queryByText('Indicator index patterns')).not.toBeInTheDocument();
    expect(screen.queryByText('Machine Learning job')).not.toBeInTheDocument();
    expect(screen.queryByText(/Event category field/)).not.toBeInTheDocument();
  });

  it('renders saved_query rule with saved query name', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'saved_query',
      saved_id: 'my-saved-query',
    });

    const allText = container.textContent ?? '';
    expect(allText).toContain('Saved query name');
    expect(allText).toContain('my-saved-query');
    expect(allText).not.toContain('Indicator index patterns');
    expect(allText).not.toContain('Machine Learning job');
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

    expect(screen.getByText('Custom query')).toBeInTheDocument();
    expect(screen.getByText('Index patterns')).toBeInTheDocument();
    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.getByText(/Results aggregated by/)).toBeInTheDocument();
    expect(screen.getByText('test-tag')).toBeInTheDocument();
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

  it('renders filters between index patterns and type-specific details', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'threshold',
      query: 'host.name: *',
      index: ['logs-*'],
      filters: [
        { meta: { key: 'host.os', type: 'phrase', value: 'linux' } },
        { meta: { key: 'agent.type', type: 'exists' } },
      ],
      threshold: { field: 'source.ip', value: 5 },
      tags: ['test-tag'],
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('host.os: linux')).toBeInTheDocument();
    expect(screen.getByText('agent.type: exists')).toBeInTheDocument();

    const allText = container.textContent ?? '';
    const indexPos = allText.indexOf('logs-*');
    const filtersPos = allText.indexOf('Filters');
    const thresholdPos = allText.indexOf('Results aggregated by');
    expect(indexPos).toBeLessThan(filtersPos);
    expect(filtersPos).toBeLessThan(thresholdPos);
  });

  it('does not render filters section when filters array is empty', () => {
    renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
      filters: [],
    });

    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('does not render filters section when filters is undefined', () => {
    renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
    });

    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('renders query in a code block with correct heading', () => {
    const { container } = renderInlineContent({
      ...baseRule,
      type: 'query',
      query: 'host.name: *',
      language: 'kuery',
    });

    expect(screen.getByText('host.name: *')).toBeInTheDocument();
    const allText = container.textContent ?? '';
    expect(allText).toContain('Custom query');
  });

  it('renders filters for indicator match rule with threat_filters', () => {
    renderInlineContent({
      ...baseRule,
      type: 'threat_match',
      query: '*:*',
      threat_index: ['filebeat-*'],
      threat_query: '*:*',
      threat_mapping: [
        { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
      ],
      filters: [{ meta: { key: 'event.category', type: 'phrase', value: 'network' } }],
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('event.category: network')).toBeInTheDocument();
  });
});
