/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMessageVariables } from './message_variables';

describe('getMessageVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return `context.attack.alertIds` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([{ description: expect.anything(), name: 'attack.alertIds' }])
    );
  });

  it('should return `context.attack.detailsMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([
        {
          description: expect.anything(),
          name: 'attack.detailsMarkdown',
          useWithTripleBracesInTemplates: true,
        },
      ])
    );
  });

  it('should return `context.attack.summaryMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([
        {
          description: expect.anything(),
          name: 'attack.summaryMarkdown',
          useWithTripleBracesInTemplates: true,
        },
      ])
    );
  });

  it('should return `context.attack.title` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([{ description: expect.anything(), name: 'attack.title' }])
    );
  });

  it('should return `context.attack.timestamp` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([{ description: expect.anything(), name: 'attack.timestamp' }])
    );
  });

  it('should return `context.attack.entitySummaryMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([
        {
          description: expect.anything(),
          name: 'attack.entitySummaryMarkdown',
          useWithTripleBracesInTemplates: true,
        },
      ])
    );
  });

  it('should return `context.attack.mitreAttackTactics` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([
        { description: expect.anything(), name: 'attack.mitreAttackTactics' },
      ])
    );
  });

  it('should return `context.attack.detailsUrl` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([
        {
          description: expect.anything(),
          name: 'attack.detailsUrl',
          useWithTripleBracesInTemplates: true,
        },
      ])
    );
  });
});
