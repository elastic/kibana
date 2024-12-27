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
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

jest.mock('../../../../assistant/use_assistant_availability');
jest.mock('@kbn/elastic-assistant');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const isAlert = true;

const renderUseAssistant = () =>
  renderHook((props: UseAssistantParams) => useAssistant(props), {
    initialProps: { dataFormattedForFieldBrowser, isAlert },
  });

describe('useAssistant', () => {
  let hookResult: RenderHookResult<UseAssistantResult, UseAssistantParams>;

  it(`should return showAssistant true and a value for promptContextId`, () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
    });
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay: jest.fn, promptContextId: '123' });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(true);
    expect(hookResult.result.current.promptContextId).toEqual('123');
  });

  it(`should return showAssistant false if hasAssistantPrivilege is false`, () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
    });
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay: jest.fn, promptContextId: '123' });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
    expect(hookResult.result.current.promptContextId).toEqual('');
  });

  it('returns anonymized prompt context data', async () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
    });
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay: jest.fn, promptContextId: '123' });

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
});
