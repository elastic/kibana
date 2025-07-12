/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseAssistantParams, UseAssistantResult } from './use_assistant';
import { useAssistant } from './use_assistant';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

jest.mock('../../../../assistant/use_assistant_availability');
jest.mock('@kbn/elastic-assistant');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const isAlert = true;

const renderUseAssistant = () =>
  renderHook((props: UseAssistantParams) => useAssistant(props), {
    initialProps: { dataFormattedForFieldBrowser, isAlert },
  });
const useAssistantOverlayMock = useAssistantOverlay as jest.Mock;

describe('useAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
    });
    useAssistantOverlayMock.mockReturnValue({
      showAssistantOverlay: jest.fn,
      promptContextId: '123',
    });

    (useAssistantContext as jest.Mock).mockReturnValue({
      basePromptContexts: [
        {
          category: 'alert',
          description: 'Alert (from view)',
          suggestedUserPrompt: 'ALERT EVALUATION',
          tooltip: 'Add this alert as context',
        },
        {
          category: 'data-quality-dashboard',
          description: 'Data Quality (index)',
          suggestedUserPrompt: 'DATA QUALITY ANALYSIS',
          tooltip: 'Add this Data Quality report as context',
        },
        {
          category: 'detection-rules',
          description: 'Selected Detection Rules',
          suggestedUserPrompt: 'RULE ANALYSIS',
          tooltip: 'Add this alert as context',
        },
        {
          category: 'event',
          description: 'Event (from view)',
          suggestedUserPrompt: 'EVENT EVALUATION',
          tooltip: 'Add this event as context',
        },
      ],
    });
  });
  let hookResult: RenderHookResult<UseAssistantResult, UseAssistantParams>;

  it(`should return showAssistant true and a value for promptContextId`, () => {
    hookResult = renderUseAssistant();
    expect(hookResult.result.current.showAssistant).toEqual(true);
    expect(hookResult.result.current.promptContextId).toEqual('123');
  });

  it(`should return showAssistant false if isAssistantEnabled is false`, () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: false,
    });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
  });

  it(`should return showAssistant false if hasAssistantPrivilege is false`, () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
    });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
    expect(hookResult.result.current.promptContextId).toEqual('');
  });

  it('returns anonymized prompt context data', async () => {
    hookResult = renderUseAssistant();

    const getPromptContext = (useAssistantOverlay as jest.Mock).mock.calls[0][3];

    expect(await getPromptContext()).toEqual({
      '@timestamp': ['2023-01-01T01:01:01.000Z'],
      _id: ['_id'],
      _index: ['index'],
      'agent.id': ['agent.id'],
      'event.category': ['registry'],
      'host.name': ['host-name'],
      'kibana.alert.ancestors.id': ['ancestors-id'],
      'kibana.alert.rule.description': ['rule-description'],
      'kibana.alert.rule.indices': ['rule-indices'],
      'kibana.alert.rule.name': ['rule-name'],
      'kibana.alert.rule.parameters.index': ['rule-parameters-index'],
      'kibana.alert.rule.type': ['query'],
      'kibana.alert.rule.uuid': ['rule-uuid'],
      'kibana.alert.url': ['alert-url'],
      'kibana.alert.workflow_status': ['open'],
      'process.entity_id': ['process-entity_id'],
      'user.name': ['user-name'],
    });
  });
  it('returns correct prompt for alert', () => {
    renderUseAssistant();
    expect(useAssistantOverlayMock.mock.calls[0][0]).toEqual('alert');
    expect(useAssistantOverlayMock.mock.calls[0][5]).toEqual('ALERT EVALUATION');
  });
  it('returns correct prompt for event', () => {
    renderHook((props: UseAssistantParams) => useAssistant(props), {
      initialProps: { dataFormattedForFieldBrowser, isAlert: false },
    });
    expect(useAssistantOverlayMock.mock.calls[0][0]).toEqual('event');
    expect(useAssistantOverlayMock.mock.calls[0][5]).toEqual('EVENT EVALUATION');
  });
});
