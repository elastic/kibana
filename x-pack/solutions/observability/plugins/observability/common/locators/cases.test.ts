/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseDetailsLocatorDefinition } from './cases';

describe('CaseDetailsLocatorDefinition', () => {
  it('should generate the correct URL path for a case without spaceId', async () => {
    const caseId = '123abc';
    const { app, path, state } = await CaseDetailsLocatorDefinition().getLocation({ caseId });
    expect(app).toBe('observability');
    expect(path).toBe(`/app/observability/cases/${caseId}`);
    expect(state).toEqual({});
  });

  it('should generate the correct URL path for a case with a basePath', async () => {
    const caseId = '123abc';
    const basePath = '/custom-base-path';
    const { app, path, state } = await CaseDetailsLocatorDefinition().getLocation({
      caseId,
      basePath,
    });
    expect(app).toBe('observability');
    expect(path).toBe(`${basePath}/app/observability/cases/${caseId}`);
    expect(state).toEqual({});
  });

  it('should generate the correct URL path for a case with a spaceId', async () => {
    const caseId = '456def';
    const spaceId = 'my-space';
    const { app, path, state } = await CaseDetailsLocatorDefinition().getLocation({
      caseId,
      spaceId,
    });
    expect(app).toBe('observability');
    expect(path).toBe(`/s/${spaceId}/app/observability/cases/${caseId}`);
    expect(state).toEqual({});
  });

  it('should handle empty string as spaceId', async () => {
    const caseId = '789ghi';
    const spaceId = '';
    const { app, path, state } = await CaseDetailsLocatorDefinition().getLocation({
      caseId,
      spaceId,
    });
    expect(app).toBe('observability');
    expect(path).toBe(`/app/observability/cases/${caseId}`);
    expect(state).toEqual({});
  });
});
