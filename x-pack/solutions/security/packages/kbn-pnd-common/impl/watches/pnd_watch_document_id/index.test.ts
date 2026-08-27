/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '../../../constants';
import { pndWatchDocumentId, resolvePndWatchDefinitionId } from '.';

const SPACE_ID = 'default';

describe('pndWatchDocumentId', () => {
  it('returns the per-space document id PND installs with workflowIdSuffix: spaceId', () => {
    expect(pndWatchDocumentId(SYSTEM_SECURITY_WATCH_FLOOR_ID, SPACE_ID)).toBe(
      'system-security-watch-floor-default'
    );
  });
});

describe('resolvePndWatchDefinitionId', () => {
  it('returns a known catalog id unchanged', () => {
    expect(resolvePndWatchDefinitionId(SYSTEM_SECURITY_WATCH_FLOOR_ID)).toBe(
      SYSTEM_SECURITY_WATCH_FLOOR_ID
    );
  });

  it('returns the catalog id for the per-space document id when spaceId is passed', () => {
    expect(
      resolvePndWatchDefinitionId(
        pndWatchDocumentId(SYSTEM_SECURITY_WATCH_FLOOR_ID, SPACE_ID),
        SPACE_ID
      )
    ).toBe(SYSTEM_SECURITY_WATCH_FLOOR_ID);
  });

  it('resolves a post-incident document id in the same space', () => {
    expect(
      resolvePndWatchDefinitionId(
        pndWatchDocumentId(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID, 'agent-3'),
        'agent-3'
      )
    ).toBe(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
  });

  it('returns undefined for a document id when spaceId is omitted', () => {
    expect(
      resolvePndWatchDefinitionId(pndWatchDocumentId(SYSTEM_SECURITY_WATCH_FLOOR_ID, SPACE_ID))
    ).toBeUndefined();
  });

  it('returns undefined for a catalog-looking id with a different suffix', () => {
    expect(
      resolvePndWatchDefinitionId('system-security-watch-floor-evil', SPACE_ID)
    ).toBeUndefined();
  });

  it('returns undefined for a catalog-looking id in the wrong space', () => {
    expect(
      resolvePndWatchDefinitionId(
        pndWatchDocumentId(SYSTEM_SECURITY_WATCH_FLOOR_ID, SPACE_ID),
        'agent-3'
      )
    ).toBeUndefined();
  });

  it('returns undefined for an unknown workflow id', () => {
    expect(resolvePndWatchDefinitionId('some-other-workflow', SPACE_ID)).toBeUndefined();
  });
});
