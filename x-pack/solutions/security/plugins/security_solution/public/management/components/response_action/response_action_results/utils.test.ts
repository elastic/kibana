/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getAgentActionState, getExportedOutput } from './utils';

describe('getAgentActionState()', () => {
  let actionGenerator: EndpointActionGenerator;
  let action: ActionDetails;

  beforeEach(() => {
    actionGenerator = new EndpointActionGenerator('test');
    action = actionGenerator.generateActionDetails({ agents: ['agent-a'] });
  });

  it('should return the agent state defined for the given agent id', () => {
    action.agentState['agent-a'] = {
      isCompleted: true,
      wasSuccessful: true,
      wasCanceled: false,
      completedAt: '2022-04-30T16:08:47.449Z',
      errors: undefined,
    };

    expect(getAgentActionState(action, 'agent-a')).toEqual(action.agentState['agent-a']);
  });

  it('should fall back to the top-level action state when the agent id has no state defined', () => {
    action.agentState = {};
    action.isCompleted = true;
    action.wasSuccessful = false;
    action.wasCanceled = true;
    action.completedAt = '2022-05-01T00:00:00.000Z';
    action.errors = ['some error'];

    expect(getAgentActionState(action, 'agent-a')).toEqual({
      isCompleted: action.isCompleted,
      wasSuccessful: action.wasSuccessful,
      wasCanceled: action.wasCanceled,
      completedAt: action.completedAt,
      errors: action.errors,
    });
  });

  it('should throw an EndpointError when the agent id is not in the action', () => {
    expect(() => getAgentActionState(action, 'not-a-real-agent')).toThrow(
      'Agent ID [not-a-real-agent] is invalid for response action [123]'
    );
  });
});

describe('getExportedOutput()', () => {
  let actionGenerator: EndpointActionGenerator;
  let exportedGetFileAction: ActionDetails;

  beforeEach(() => {
    actionGenerator = new EndpointActionGenerator('test');
    exportedGetFileAction = actionGenerator.generateActionDetails({
      command: 'get-file',
      agents: ['agent-a'],
      parameters: { path: '/some/file', export: 'azure-1' },
    });
  });

  it.each([
    ['get-file', { path: '/some/file', export: 'azure-1' }],
    ['memory-dump', { type: 'kernel', export: 'azure-1' }],
  ] as const)('should return the exported output of a `%s` action', (command, parameters) => {
    const action = actionGenerator.generateActionDetails({
      command,
      agents: ['agent-a'],
      parameters,
    });

    expect(getExportedOutput(action, 'agent-a')).toEqual({
      export: 'azure-1',
      service: 'azure_blob',
      account: 'acct',
      container: 'response-actions',
      path: '123/upload.zip',
    });
  });

  it('should return `undefined` when the file was not exported', () => {
    const action = actionGenerator.generateActionDetails({
      command: 'get-file',
      agents: ['agent-a'],
    });

    expect(getExportedOutput(action, 'agent-a')).toBeUndefined();
  });

  it('should return `undefined` when the action has no output for the agent', () => {
    expect(getExportedOutput(exportedGetFileAction, 'agent-b')).toBeUndefined();
    expect(
      getExportedOutput({ ...exportedGetFileAction, outputs: undefined }, 'agent-a')
    ).toBeUndefined();
  });

  it('should return `undefined` without throwing when the output content is a string', () => {
    // `text` outputs have a string `content` at runtime, despite the type
    Object.assign(exportedGetFileAction.outputs?.['agent-a'] ?? {}, {
      type: 'text',
      content: 'some text',
    });

    expect(exportedGetFileAction.outputs?.['agent-a']?.content).toBe('some text');
    expect(getExportedOutput(exportedGetFileAction, 'agent-a')).toBeUndefined();
  });

  it('should return `undefined` when `exported` is not an object', () => {
    Object.assign(exportedGetFileAction.outputs?.['agent-a']?.content ?? {}, { exported: null });

    expect(exportedGetFileAction.outputs?.['agent-a']?.content).toHaveProperty('exported', null);
    expect(getExportedOutput(exportedGetFileAction, 'agent-a')).toBeUndefined();
  });
});
