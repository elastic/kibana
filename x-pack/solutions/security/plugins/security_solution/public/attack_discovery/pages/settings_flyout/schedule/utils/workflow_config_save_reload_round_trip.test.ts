/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { AIConnector } from '@kbn/elastic-assistant';
import {
  CreateAttackDiscoveryScheduleRequestBody,
  GetAttackDiscoveryScheduleResponse,
} from '@kbn/discoveries-schemas';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import type { WorkflowConfiguration } from '../../workflow_configuration/types';
import { convertFormDataToWorkflowSchedule } from './convert_form_data';
import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from '../logic/transform_attack_discovery_schedule';
import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';
import { parseFilterQuery } from '../../parse_filter_query';

jest.mock('../../../../../common/lib/kuery');
jest.mock('../../../use_attack_discovery/helpers');
jest.mock('../../parse_filter_query');

/**
 * CRUD6 — the exact past regression, as a full-chain integration round-trip.
 *
 * Reproduces "save a schedule with non-default selections -> reload the edit
 * flyout -> the controls reflect the saved selection", crossing every seam in
 * code: form -> formToApi (convert) -> wire schema parse (create) -> server
 * persistence (modeled as identity) -> GET response schema parse -> apiToForm
 * (transform) -> edit-flyout hydration.
 *
 * NON-default values are used throughout so a field dropped at any seam cannot
 * coincide with its default and pass undetected.
 */

const CONNECTOR = {
  actionTypeId: '.gen-ai',
  id: 'test-connector',
  name: 'Test Connector',
} as unknown as AIConnector;

const UI_SETTINGS = { get: jest.fn() } as unknown as IUiSettingsClient;

const baseFormData = {
  actions: [],
  alertsSelectionSettings: {
    end: 'now',
    filters: [],
    query: { language: 'kuery', query: '' },
    size: 100,
    start: 'now-24h',
  },
  connectorId: 'test-connector',
  interval: '24h',
  name: 'Round-trip schedule',
};

/**
 * Simulates the full save -> reload path and returns the `workflowConfig` that
 * the edit flyout would re-hydrate. The edit flyout reads
 * `params.workflowConfig` back from the schedule (see `details_flyout` +
 * `edit_form`), so this is exactly what each control would reflect on reload.
 */
const saveThenReload = (
  workflowConfig: WorkflowConfiguration
): WorkflowConfiguration | undefined => {
  // form -> formToApi
  const createBody = convertFormDataToWorkflowSchedule(
    { ...baseFormData, workflowConfig },
    '.alerts-security.alerts-default',
    CONNECTOR,
    UI_SETTINGS,
    createStubDataView({ spec: {} })
  );

  // wire schema parse (create) — Zod strips unknown keys, so this fails loudly
  // if `convertFormDataToWorkflowSchedule` emitted a key the schema does not know.
  const parsedCreateBody = CreateAttackDiscoveryScheduleRequestBody.parse(createBody);

  // server persistence is modeled as identity on params; the GET response is
  // what the edit flyout fetches on reload.
  const getResponse = GetAttackDiscoveryScheduleResponse.parse({
    actions: [],
    created_at: '2025-04-09T08:51:04.697Z',
    created_by: 'elastic',
    enabled: true,
    id: 'sched-1',
    name: parsedCreateBody.name,
    params: parsedCreateBody.params,
    schedule: parsedCreateBody.schedule,
    updated_at: '2025-04-09T21:10:16.483Z',
    updated_by: 'elastic',
  });

  // apiToForm (transform) -> edit-flyout hydration
  const reHydrated = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(getResponse);

  return reHydrated.params.workflowConfig;
};

describe('workflowConfig save -> reload round-trip (CRUD6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (convertToBuildEsQuery as jest.Mock).mockReturnValue(['test-filter-query']);
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: 'test-model' });
    (parseFilterQuery as jest.Mock).mockReturnValue({ bool: {} });
  });

  it('reloads an esql + workflows + skill-OFF config exactly as saved (create)', () => {
    const saved: WorkflowConfiguration = {
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      skillEnabled: false,
      validationWorkflowId: 'custom-validate',
    };

    expect(saveThenReload(saved)).toEqual(saved);
  });

  it('reloads a query-builder default-retrieval config exactly as saved (create)', () => {
    const saved: WorkflowConfiguration = {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: [],
      alertRetrievalWorkflowsEnabled: false,
      defaultRetrievalEnabled: true,
      skillEnabled: false,
      validationWorkflowId: 'team-validation',
    };

    expect(saveThenReload(saved)).toEqual(saved);
  });

  it('reloads edits (flip toggles, change ids/esql) exactly as re-saved (edit)', () => {
    const initial: WorkflowConfiguration = {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: ['only-this'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: false,
      skillEnabled: false,
      validationWorkflowId: 'initial-validation',
    };

    // first save -> reload re-hydrates the saved selection
    const reHydrated = saveThenReload(initial);
    expect(reHydrated).toEqual(initial);

    // the user edits the re-hydrated config: flip toggles, switch to esql, change ids
    const edited: WorkflowConfiguration = {
      ...(reHydrated as WorkflowConfiguration),
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['changed-1', 'changed-2'],
      alertRetrievalWorkflowsEnabled: false,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM logs-* | WHERE event.kind == "alert"',
      skillEnabled: true,
      validationWorkflowId: 'edited-validation',
    };

    // second save -> reload re-hydrates the edited selection
    expect(saveThenReload(edited)).toEqual(edited);
  });
});
