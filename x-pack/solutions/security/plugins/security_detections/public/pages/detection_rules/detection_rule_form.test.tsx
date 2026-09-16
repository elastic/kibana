/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Component tests for the detection rule create / edit form.
 *
 * Tests cover:
 *  - Validation errors surface for both types (query, threshold).
 *  - Create for a query rule submits the right POST payload.
 *  - Create for a threshold rule submits the right POST payload.
 *  - Edit round-trips a loaded rule without losing fields.
 *  - The `enabled` toggle is absent in edit mode.
 *  - The type selector is absent (read-only display) in edit mode.
 *  - Threshold-specific fields appear for the threshold type and are absent
 *    for the query type.
 *
 * The HTTP layer is mocked through the DetectionRulesApi mock passed via
 * DetectionRulesContext, matching the pattern used in detection_rules_page.test.tsx.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DetectionRuleResponse } from '../../../common/api';
import type { DetectionRulesApi } from '../../services/detection_rules_api';
import { DetectionRulesContext } from './detection_rules_context';
import type { DetectionRuleFormState, FieldErrors } from './detection_rule_form';
import {
  DetectionRuleForm,
  defaultFormState,
  formStateFromRule,
  assembleCreatePayload,
  assembleUpdatePayload,
  validatePayload,
} from './detection_rule_form';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeQueryRule = (overrides: Partial<DetectionRuleResponse> = {}): DetectionRuleResponse =>
  ({
    id: 'rule-query-1',
    rule_id: 'sig-1',
    revision: 0,
    source: { type: 'internal' },
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: 'user',
    enabled: true,
    version: 1,
    name: 'My Query Rule',
    description: 'Detects bad things',
    tags: ['prod', 'linux'],
    severity: 'high',
    risk_score: 75,
    max_signals: 100,
    threat: [],
    setup: 'Install the agent.',
    note: 'Check the logs.',
    references: ['https://example.com'],
    false_positives: ['FP1'],
    author: ['Alice'],
    license: 'Elastic License 2.0',
    related_integrations: [],
    required_fields: [],
    schedule: { interval: '5m', lookback: '1m' },
    type: 'query',
    index: ['logs-*', 'metrics-*'],
    query: 'host.name: "evil"',
    language: 'kuery',
    ...overrides,
  } as DetectionRuleResponse);

const makeThresholdRule = (overrides: Partial<DetectionRuleResponse> = {}): DetectionRuleResponse =>
  ({
    id: 'rule-threshold-1',
    rule_id: 'sig-2',
    revision: 0,
    source: { type: 'internal' },
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: 'user',
    enabled: false,
    version: 2,
    name: 'My Threshold Rule',
    description: 'Groups by IP',
    tags: ['network'],
    severity: 'critical',
    risk_score: 99,
    max_signals: 50,
    threat: [],
    setup: '',
    references: [],
    false_positives: [],
    author: [],
    license: undefined,
    note: undefined,
    related_integrations: [],
    required_fields: [],
    schedule: { interval: '10m' },
    type: 'threshold',
    index: ['logs-*'],
    query: '',
    language: 'kuery',
    threshold: {
      field: ['source.ip'],
      value: 5,
      cardinality: [{ field: 'user.name', value: 3 }],
    },
    ...overrides,
  } as DetectionRuleResponse);

const makeApi = (overrides: Partial<DetectionRulesApi> = {}): jest.Mocked<DetectionRulesApi> =>
  ({
    listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 0, data: [] }),
    enableRule: jest.fn(),
    disableRule: jest.fn(),
    deleteRule: jest.fn(),
    getRule: jest.fn(),
    createRule: jest.fn().mockResolvedValue(makeQueryRule()),
    updateRule: jest.fn().mockResolvedValue(makeQueryRule()),
    ...overrides,
  } as jest.Mocked<DetectionRulesApi>);

const makeNotifications = () => ({
  toasts: { addSuccess: jest.fn(), addDanger: jest.fn() },
});

/** A thin wrapper that owns the form state for testing. */
const FormWrapper: React.FC<{
  api: jest.Mocked<DetectionRulesApi>;
  initialState: DetectionRuleFormState;
  ruleToEdit?: DetectionRuleResponse;
  onSubmit?: (state: DetectionRuleFormState) => void;
  onCancel?: () => void;
}> = ({ api, initialState, ruleToEdit, onSubmit, onCancel }) => {
  const [formState, setFormState] = useState<DetectionRuleFormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError] = useState<string | null>(null);

  const notifications = makeNotifications();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const handleSubmit = () => {
    const mode = ruleToEdit ? 'edit' : 'create';
    const payload = ruleToEdit
      ? assembleUpdatePayload(formState, ruleToEdit)
      : assembleCreatePayload(formState);

    const validationErrors = validatePayload(payload, mode);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit?.(formState);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <DetectionRulesContext.Provider value={{ api, notifications: notifications as any }}>
        <DetectionRuleForm
          ruleToEdit={ruleToEdit}
          formState={formState}
          errors={errors}
          isSubmitting={false}
          submitError={submitError}
          onChange={setFormState}
          onSubmit={handleSubmit}
          onCancel={onCancel ?? jest.fn()}
        />
      </DetectionRulesContext.Provider>
    </QueryClientProvider>
  );
};

// ---------------------------------------------------------------------------
// assembleCreatePayload unit tests
// ---------------------------------------------------------------------------

describe('assembleCreatePayload', () => {
  it('builds a query rule payload from form state', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('query'),
      name: 'Test Rule',
      description: 'desc',
      severity: 'high',
      risk_score: '75',
      index: 'logs-*, metrics-*',
      query: 'host.name: *',
      language: 'kuery',
      tags: 'prod, linux',
      max_signals: '100',
      schedule_interval: '5m',
      enabled: false,
    };
    const payload = assembleCreatePayload(state) as Record<string, unknown>;

    expect(payload.type).toBe('query');
    expect(payload.name).toBe('Test Rule');
    expect(payload.description).toBe('desc');
    expect(payload.severity).toBe('high');
    expect(payload.risk_score).toBe(75);
    expect(payload.index).toEqual(['logs-*', 'metrics-*']);
    expect(payload.query).toBe('host.name: *');
    expect(payload.language).toBe('kuery');
    expect(payload.tags).toEqual(['prod', 'linux']);
    expect(payload.max_signals).toBe(100);
    expect((payload.schedule as Record<string, unknown>).interval).toBe('5m');
    expect(payload.enabled).toBe(false);
    // No threshold on a query rule payload
    expect(payload.threshold).toBeUndefined();
  });

  it('builds a threshold rule payload with cardinality', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('threshold'),
      name: 'Threshold Rule',
      description: 'groups by IP',
      severity: 'critical',
      risk_score: '99',
      index: 'logs-*',
      query: '',
      language: 'kuery',
      threshold_field: 'source.ip, destination.port',
      threshold_value: '5',
      threshold_cardinality_field: 'user.name',
      threshold_cardinality_value: '3',
      schedule_interval: '10m',
      enabled: true,
    };
    const payload = assembleCreatePayload(state) as Record<string, unknown>;
    const threshold = payload.threshold as Record<string, unknown>;

    expect(payload.type).toBe('threshold');
    expect(threshold.field).toEqual(['source.ip', 'destination.port']);
    expect(threshold.value).toBe(5);
    expect((threshold.cardinality as Array<Record<string, unknown>>)[0].field).toBe('user.name');
    expect((threshold.cardinality as Array<Record<string, unknown>>)[0].value).toBe(3);
  });

  it('omits cardinality when cardinality field is empty', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('threshold'),
      name: 'Threshold Rule',
      description: 'no cardinality',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: '',
      language: 'kuery',
      threshold_field: 'source.ip',
      threshold_value: '3',
      threshold_cardinality_field: '',
      schedule_interval: '5m',
    };
    const payload = assembleCreatePayload(state) as Record<string, unknown>;
    const threshold = payload.threshold as Record<string, unknown>;

    expect(threshold.cardinality).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// assembleUpdatePayload unit tests
// ---------------------------------------------------------------------------

describe('assembleUpdatePayload', () => {
  it('excludes `enabled` from the PUT body', () => {
    const rule = makeQueryRule({ enabled: true });
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;

    expect(payload.enabled).toBeUndefined();
  });

  it('re-injects threat, related_integrations, required_fields from the original rule', () => {
    const rule = makeQueryRule({
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://attack.mitre.org' },
          technique: [],
        },
      ],
    });
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;

    expect(payload.threat).toEqual(rule.threat);
    expect(payload.related_integrations).toEqual(rule.related_integrations);
    expect(payload.required_fields).toEqual(rule.required_fields);
  });

  it('round-trips all fields from a loaded query rule', () => {
    const rule = makeQueryRule();
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;

    expect(payload.name).toBe(rule.name);
    expect(payload.description).toBe(rule.description);
    expect(payload.severity).toBe(rule.severity);
    expect(payload.risk_score).toBe(rule.risk_score);
    expect(payload.index).toEqual(rule.index);
    expect(payload.query).toBe(rule.query);
    expect(payload.language).toBe(rule.language);
    expect(payload.tags).toEqual(rule.tags);
    expect(payload.max_signals).toBe(rule.max_signals);
    expect(payload.setup).toBe(rule.setup);
    expect(payload.note).toBe(rule.note);
    expect(payload.license).toBe(rule.license);
    expect(payload.references).toEqual(rule.references);
    expect(payload.false_positives).toEqual(rule.false_positives);
    expect(payload.author).toEqual(rule.author);
    expect((payload.schedule as Record<string, unknown>).interval).toBe(rule.schedule.interval);
    expect((payload.schedule as Record<string, unknown>).lookback).toBe(rule.schedule.lookback);
    expect(payload.version).toBe(rule.version);
  });

  it('round-trips all threshold fields from a loaded threshold rule', () => {
    const rule = makeThresholdRule();
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;
    const threshold = payload.threshold as Record<string, unknown>;

    expect(payload.type).toBe('threshold');
    expect(threshold.field).toEqual((rule as any).threshold.field);
    expect(threshold.value).toBe((rule as any).threshold.value);
    expect((threshold.cardinality as Array<Record<string, unknown>>)[0].field).toBe(
      (rule as any).threshold.cardinality[0].field
    );
    expect((threshold.cardinality as Array<Record<string, unknown>>)[0].value).toBe(
      (rule as any).threshold.cardinality[0].value
    );
  });
});

// ---------------------------------------------------------------------------
// validatePayload unit tests
// ---------------------------------------------------------------------------

describe('validatePayload', () => {
  it('returns empty errors for a valid query rule create payload', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('query'),
      name: 'Valid Rule',
      description: 'desc',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: 'host.name: *',
      language: 'kuery',
      schedule_interval: '5m',
    };
    const payload = assembleCreatePayload(state);
    const errors = validatePayload(payload, 'create');

    expect(errors).toEqual({});
  });

  it('reports an error for a missing name on create', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('query'),
      name: '',
      description: 'desc',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: 'host.name: *',
      language: 'kuery',
      schedule_interval: '5m',
    };
    const payload = assembleCreatePayload(state);
    const errors = validatePayload(payload, 'create');

    expect(errors.name).toBeDefined();
    expect(errors.name.length).toBeGreaterThan(0);
  });

  it('reports an error for an empty query on a query-type create', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('query'),
      name: 'Rule',
      description: 'desc',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: '',
      language: 'kuery',
      schedule_interval: '5m',
    };
    const payload = assembleCreatePayload(state);
    const errors = validatePayload(payload, 'create');

    // query type forbids empty query
    expect(errors.query).toBeDefined();
  });

  it('accepts an empty query for a threshold-type create', () => {
    const state: DetectionRuleFormState = {
      ...defaultFormState('threshold'),
      name: 'Threshold',
      description: 'desc',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: '',
      language: 'kuery',
      threshold_field: '',
      threshold_value: '5',
      schedule_interval: '5m',
    };
    const payload = assembleCreatePayload(state);
    const errors = validatePayload(payload, 'create');

    expect(errors.query).toBeUndefined();
  });

  it('returns empty errors for a valid query rule update payload', () => {
    const rule = makeQueryRule();
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule);
    const errors = validatePayload(payload, 'edit');

    expect(errors).toEqual({});
  });

  it('returns empty errors for a valid threshold rule update payload', () => {
    const rule = makeThresholdRule();
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule);
    const errors = validatePayload(payload, 'edit');

    expect(errors).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// formStateFromRule unit tests
// ---------------------------------------------------------------------------

describe('formStateFromRule', () => {
  it('initializes all base fields from a query rule', () => {
    const rule = makeQueryRule();
    const state = formStateFromRule(rule);

    expect(state.type).toBe('query');
    expect(state.name).toBe(rule.name);
    expect(state.description).toBe(rule.description);
    expect(state.severity).toBe(rule.severity);
    expect(state.risk_score).toBe(String(rule.risk_score));
    expect(state.tags).toBe(rule.tags.join(', '));
    expect(state.max_signals).toBe(String(rule.max_signals));
    expect(state.setup).toBe(rule.setup);
    expect(state.note).toBe(rule.note);
    expect(state.license).toBe(rule.license);
    expect(state.references).toBe(rule.references.join(', '));
    expect(state.false_positives).toBe(rule.false_positives.join(', '));
    expect(state.author).toBe(rule.author.join(', '));
    expect(state.schedule_interval).toBe(rule.schedule.interval);
    expect(state.schedule_lookback).toBe(rule.schedule.lookback ?? '');
    expect(state.index).toBe(rule.index.join(', '));
    expect(state.query).toBe(rule.query);
    expect(state.language).toBe(rule.language);
  });

  it('initializes threshold fields from a threshold rule', () => {
    const rule = makeThresholdRule();
    const state = formStateFromRule(rule);

    expect(state.type).toBe('threshold');
    expect(state.threshold_field).toBe((rule as any).threshold.field.join(', '));
    expect(state.threshold_value).toBe(String((rule as any).threshold.value));
    expect(state.threshold_cardinality_field).toBe((rule as any).threshold.cardinality[0].field);
    expect(state.threshold_cardinality_value).toBe(
      String((rule as any).threshold.cardinality[0].value)
    );
  });

  it('leaves threshold fields empty for a query rule', () => {
    const rule = makeQueryRule();
    const state = formStateFromRule(rule);

    expect(state.threshold_field).toBe('');
    expect(state.threshold_value).toBe('1');
    expect(state.threshold_cardinality_field).toBe('');
    expect(state.threshold_cardinality_value).toBe('');
  });

  it('sets enabled from the rule value (not used in PUT but stored in state)', () => {
    expect(formStateFromRule(makeQueryRule({ enabled: true })).enabled).toBe(true);
    expect(formStateFromRule(makeQueryRule({ enabled: false })).enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------

describe('DetectionRuleForm — create mode', () => {
  it('renders the type selector in create mode', () => {
    const api = makeApi();
    render(<FormWrapper api={api} initialState={defaultFormState('query')} />);

    expect(screen.getByTestId('ruleFormTypeSelect')).toBeInTheDocument();
    // The read-only display must NOT be present.
    expect(screen.queryByTestId('ruleFormTypeDisplay')).toBeNull();
  });

  it('renders the enabled toggle in create mode', () => {
    const api = makeApi();
    render(<FormWrapper api={api} initialState={defaultFormState('query')} />);

    expect(screen.getByTestId('ruleFormEnabled')).toBeInTheDocument();
  });

  it('renders threshold-specific fields when type is threshold', () => {
    const api = makeApi();
    render(<FormWrapper api={api} initialState={defaultFormState('threshold')} />);

    expect(screen.getByTestId('ruleFormThresholdField')).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormThresholdValue')).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormThresholdCardinalityField')).toBeInTheDocument();
  });

  it('does not render threshold-specific fields when type is query', () => {
    const api = makeApi();
    render(<FormWrapper api={api} initialState={defaultFormState('query')} />);

    expect(screen.queryByTestId('ruleFormThresholdField')).toBeNull();
    expect(screen.queryByTestId('ruleFormThresholdValue')).toBeNull();
  });

  it('surfaces a validation error when name is blank on submit', async () => {
    const onSubmit = jest.fn();
    const api = makeApi();
    render(
      <FormWrapper
        api={api}
        initialState={{ ...defaultFormState('query'), name: '' }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('ruleFormSubmit'));

    await waitFor(() => {
      // The submit callback must not be called.
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('calls onSubmit callback when a valid query rule form is submitted', async () => {
    const onSubmit = jest.fn();
    const api = makeApi();
    const state: DetectionRuleFormState = {
      ...defaultFormState('query'),
      name: 'Valid Rule',
      description: 'Test',
      severity: 'low',
      risk_score: '21',
      index: 'logs-*',
      query: 'host.name: *',
      language: 'kuery',
      schedule_interval: '5m',
    };

    render(<FormWrapper api={api} initialState={state} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId('ruleFormSubmit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSubmit callback when a valid threshold rule form is submitted', async () => {
    const onSubmit = jest.fn();
    const api = makeApi();
    const state: DetectionRuleFormState = {
      ...defaultFormState('threshold'),
      name: 'Threshold Rule',
      description: 'Test threshold',
      severity: 'high',
      risk_score: '75',
      index: 'logs-*',
      query: '',
      language: 'kuery',
      threshold_field: 'source.ip',
      threshold_value: '5',
      schedule_interval: '5m',
    };

    render(<FormWrapper api={api} initialState={state} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId('ruleFormSubmit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    const api = makeApi();
    render(<FormWrapper api={api} initialState={defaultFormState('query')} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('ruleFormCancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('DetectionRuleForm — edit mode', () => {
  it('renders the type as a read-only display in edit mode', () => {
    const rule = makeQueryRule();
    const api = makeApi();
    render(<FormWrapper api={api} initialState={formStateFromRule(rule)} ruleToEdit={rule} />);

    expect(screen.getByTestId('ruleFormTypeDisplay')).toBeInTheDocument();
    // The type selector must NOT be present in edit mode.
    expect(screen.queryByTestId('ruleFormTypeSelect')).toBeNull();
  });

  it('does not render the enabled toggle in edit mode', () => {
    const rule = makeQueryRule();
    const api = makeApi();
    render(<FormWrapper api={api} initialState={formStateFromRule(rule)} ruleToEdit={rule} />);

    expect(screen.queryByTestId('ruleFormEnabled')).toBeNull();
  });

  it('pre-populates name and description from the loaded rule', () => {
    const rule = makeQueryRule({ name: 'Loaded Rule', description: 'Loaded desc' });
    const api = makeApi();
    render(<FormWrapper api={api} initialState={formStateFromRule(rule)} ruleToEdit={rule} />);

    const nameInput = screen.getByTestId('ruleFormName') as HTMLInputElement;
    expect(nameInput.value).toBe('Loaded Rule');

    const descInput = screen.getByTestId('ruleFormDescription') as HTMLTextAreaElement;
    expect(descInput.value).toBe('Loaded desc');
  });

  it('pre-populates threshold fields from a loaded threshold rule', () => {
    const rule = makeThresholdRule();
    const api = makeApi();
    render(<FormWrapper api={api} initialState={formStateFromRule(rule)} ruleToEdit={rule} />);

    const thresholdField = screen.getByTestId('ruleFormThresholdField') as HTMLInputElement;
    expect(thresholdField.value).toBe((rule as any).threshold.field.join(', '));

    const thresholdValue = screen.getByTestId('ruleFormThresholdValue') as HTMLInputElement;
    expect(thresholdValue.value).toBe(String((rule as any).threshold.value));
  });

  it('calls onSubmit with the full state including unchanged fields (round-trip)', async () => {
    const onSubmit = jest.fn();
    const rule = makeQueryRule();
    const api = makeApi();
    render(
      <FormWrapper
        api={api}
        initialState={formStateFromRule(rule)}
        ruleToEdit={rule}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('ruleFormSubmit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    // The state passed to onSubmit must include all fields from the original rule.
    const submittedState = onSubmit.mock.calls[0][0] as DetectionRuleFormState;
    expect(submittedState.name).toBe(rule.name);
    expect(submittedState.description).toBe(rule.description);
    expect(submittedState.severity).toBe(rule.severity);
    expect(submittedState.risk_score).toBe(String(rule.risk_score));
    expect(submittedState.index).toBe(rule.index.join(', '));
    expect(submittedState.query).toBe(rule.query);
    expect(submittedState.language).toBe(rule.language);
    expect(submittedState.tags).toBe(rule.tags.join(', '));
    expect(submittedState.schedule_interval).toBe(rule.schedule.interval);
    expect(submittedState.schedule_lookback).toBe(rule.schedule.lookback ?? '');
    expect(submittedState.note).toBe(rule.note ?? '');
    expect(submittedState.setup).toBe(rule.setup);
  });

  it('the PUT payload assembled from the loaded state does not contain enabled', () => {
    const rule = makeQueryRule({ enabled: true });
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;

    expect('enabled' in payload).toBe(false);
  });

  it('the PUT payload preserves threat from the original rule even though it is not in the form', () => {
    const rule = makeQueryRule({
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://attack.mitre.org' },
          technique: [],
        },
      ],
    });
    const state = formStateFromRule(rule);
    const payload = assembleUpdatePayload(state, rule) as Record<string, unknown>;

    expect(payload.threat).toEqual(rule.threat);
  });
});
