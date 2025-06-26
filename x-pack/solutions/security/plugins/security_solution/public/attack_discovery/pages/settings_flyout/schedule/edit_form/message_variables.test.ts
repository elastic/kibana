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
      expect.arrayContaining([expect.objectContaining({ name: 'attack.alertIds' })])
    );
  });

  it('should return `context.attack.detailsMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.detailsMarkdown' })])
    );
  });

  it('should return `context.attack.summaryMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.summaryMarkdown' })])
    );
  });

  it('should return `context.attack.title` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.title' })])
    );
  });

  it('should return `context.attack.timestamp` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.timestamp' })])
    );
  });

  it('should return `context.attack.entitySummaryMarkdown` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.entitySummaryMarkdown' })])
    );
  });

  it('should return `context.attack.mitreAttackTactics` action variable', () => {
    const variables = getMessageVariables().context;
    expect(variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attack.mitreAttackTactics' })])
    );
  });
});
