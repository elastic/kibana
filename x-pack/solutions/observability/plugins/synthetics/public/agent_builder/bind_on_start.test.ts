/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { MONITOR_MANAGEMENT_ATTACHMENT_TYPE } from '../../common/agent_builder';
import { bindAgentBuilderOnStart } from './bind_on_start';

const buildAgentBuilderStart = () => {
  const addAttachmentType = jest.fn();
  return {
    mock: {
      attachments: { addAttachmentType },
    } as unknown as AgentBuilderPluginStart,
    addAttachmentType,
  };
};

const stubHttp = {} as HttpStart;
const stubApplication = {
  capabilities: {},
  getUrlForApp: jest.fn(),
  navigateToUrl: jest.fn(),
} as unknown as ApplicationStart;

describe('bindAgentBuilderOnStart', () => {
  it('returns plugin_missing without touching anything when agentBuilder is undefined', () => {
    const result = bindAgentBuilderOnStart({
      agentBuilder: undefined,
      http: stubHttp,
      application: stubApplication,
    });
    expect(result).toEqual({ registered: false, reason: 'plugin_missing' });
  });

  it('registers the attachment UI definition when the agentBuilder plugin is present', () => {
    const { mock, addAttachmentType } = buildAgentBuilderStart();
    const result = bindAgentBuilderOnStart({
      agentBuilder: mock,
      http: stubHttp,
      application: stubApplication,
    });
    expect(result).toEqual({ registered: true });
    expect(addAttachmentType).toHaveBeenCalledTimes(1);
    expect(addAttachmentType.mock.calls[0][0]).toBe(MONITOR_MANAGEMENT_ATTACHMENT_TYPE);
  });

  it('passes a UI definition with both inline and canvas renderers wired', () => {
    const { mock, addAttachmentType } = buildAgentBuilderStart();
    bindAgentBuilderOnStart({
      agentBuilder: mock,
      http: stubHttp,
      application: stubApplication,
    });
    const uiDefinition = addAttachmentType.mock.calls[0][1];
    expect(typeof uiDefinition.renderInlineContent).toBe('function');
    expect(typeof uiDefinition.renderCanvasContent).toBe('function');
    expect(typeof uiDefinition.getActionButtons).toBe('function');
    expect(uiDefinition.canvasWidth).toBe('40vw');
  });
});
