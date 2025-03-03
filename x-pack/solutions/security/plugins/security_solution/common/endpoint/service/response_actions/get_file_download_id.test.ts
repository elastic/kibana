/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointActionGenerator } from '../../data_generators/endpoint_action_generator';
import type { ActionDetails } from '../../types';
import { getFileDownloadId } from './get_file_download_id';

describe('getFileDownloadId()', () => {
  let action: ActionDetails;
  let agentId: string;

  beforeEach(() => {
    action = new EndpointActionGenerator().generateActionDetails();
    agentId = action.agents[0];
  });

  it('should throw if agentId is not listed in the action', () => {
    action.agents = ['foo'];

    expect(() => getFileDownloadId(action, agentId)).toThrow(
      `Action [${action.id}] was not sent to agent id [${agentId}]`
    );
  });

  it('Should return expected id for Endpoint agent type when agentId is passed as an argument', () => {
    expect(getFileDownloadId(action, agentId)).toEqual(`${action.id}.${agentId}`);
  });

  it('Should return expected id for Endpoint agent type when agentId is NOT passed as an argument', () => {
    action.agents = ['foo', 'foo2'];

    expect(getFileDownloadId(action)).toEqual(`${action.id}.foo`);
  });

  it('should return expected ID for non-endpoint agent types when agentId is passed as an argument', () => {
    action.agentType = 'sentinel_one';
    expect(getFileDownloadId(action, agentId)).toEqual(agentId);
  });

  it('should return expected ID for non-endpoint agent types when agentId is NOT passed as an argument', () => {
    action.agentType = 'sentinel_one';
    action.agents = ['foo', 'foo2'];

    expect(getFileDownloadId(action)).toEqual(`foo`);
  });
});
