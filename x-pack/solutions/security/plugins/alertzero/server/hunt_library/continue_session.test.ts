/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createAttachmentNotFoundError } from '@kbn/agent-builder-common';
import { HUNT_SESSION_ATTACHMENT_ID } from '../../common/hunt_session_attachment_schema';
import { continueHuntSession } from './continue_session';
import { getHuntDefinition } from './seed';

const definition = getHuntDefinition('okta_failed_oauth_public_client_scope')!;
const NEW_SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';
const INVESTIGATION = 'inv-1';

const header = {
  version: 1,
  definition: {
    id: definition.id,
    version: definition.version,
    name: definition.name,
    hypothesis: definition.hypothesis,
  },
  revision: 2,
};
const resumeSnapshot = {
  query: 'FROM logs-okta | WHERE x',
  filters: [{ field: 'a' }],
  timeRange: { from: 'now-2d', to: 'now' },
  columns: ['@timestamp', 'a'],
  dataViewId: 'dv-9',
};
const manual = {
  ...header,
  trigger: 'manual',
  has_manual_append: false,
  preservations: [],
  resumeSnapshot,
};
const automated = {
  ...header,
  trigger: 'automated',
  has_manual_append: false,
  adjudication: {
    group_id: 'v1:abc',
    summary: 's',
    severity: 'high',
    hypotheses: ['h'],
    citations: [],
    executionWindow: { from: '2026-11-01T00:00:00Z', to: '2026-11-02T00:00:00Z' },
    query: 'FROM x',
  },
};

const setup = ({ stored, getFails = false }: { stored?: unknown; getFails?: boolean } = {}) => {
  const management = {
    findExecutionsByLabel: jest.fn().mockResolvedValue([]),
    executeLabeledWorkflow: jest
      .fn()
      .mockResolvedValue({ workflowExecutionId: 'x', reusedExisting: false }),
    updateExecutionLabels: jest.fn().mockResolvedValue({}),
  };
  const conversations = {
    get: getFails
      ? jest.fn().mockRejectedValue(new Error('forbidden'))
      : jest.fn().mockResolvedValue({}),
  };
  const attachments = {
    get: jest.fn(async () => {
      if (stored === undefined) {
        throw createAttachmentNotFoundError({ attachmentId: HUNT_SESSION_ATTACHMENT_ID });
      }
      return { versions: [{ version: 1, data: stored }], current_version: 1 };
    }),
  };
  return {
    management,
    conversations,
    run: () =>
      continueHuntSession({
        management: management as never,
        request: httpServerMock.createKibanaRequest(),
        conversations: conversations as never,
        attachments: attachments as never,
        logger: loggingSystemMock.createLogger(),
        spaceId: 'default',
        investigationId: INVESTIGATION,
        newSessionId: NEW_SESSION,
      }),
  };
};

describe('continueHuntSession', () => {
  it('restores the latest saved Discover state of a manual session', async () => {
    const { run } = setup({ stored: manual });

    const result = await run();

    expect(result.resume).toEqual({
      query: resumeSnapshot.query,
      filters: resumeSnapshot.filters,
      time_range: resumeSnapshot.timeRange,
      columns: resumeSnapshot.columns,
      data_view_id: 'dv-9',
    });
  });

  it("opens an automated Investigation at the hunt's query and the automated run's window", async () => {
    const { run } = setup({ stored: automated });

    const result = await run();

    expect(result.resume).toEqual({
      query: definition.query.query,
      filters: [],
      time_range: automated.adjudication.executionWindow,
      columns: definition.query.recommendedColumns,
      data_view_id: '',
    });
  });

  it('records a fresh session linked to the Investigation', async () => {
    const { run, management } = setup({ stored: manual });

    const result = await run();

    expect(result.session_id).toBe(NEW_SESSION);
    expect(management.executeLabeledWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ executionId: result.execution_id })
    );
    expect(result.investigation_id).toBe(INVESTIGATION);
    expect(result.profile_token).toBe(result.execution_id);
    expect(management.updateExecutionLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: result.execution_id,
        labels: { 'hunt.investigation_id': INVESTIGATION },
      })
    );
  });

  it('fails when the session cannot be linked to the Investigation', async () => {
    const { run, management } = setup({ stored: manual });
    management.updateExecutionLabels.mockRejectedValue(new Error('label write failed'));

    await expect(run()).rejects.toThrow('label write failed');
  });

  it('refuses an Investigation the analyst cannot reach, and starts no session', async () => {
    const { run, management } = setup({ stored: manual, getFails: true });

    await expect(run()).rejects.toMatchObject({ code: 'investigation_inaccessible' });
    expect(management.executeLabeledWorkflow).not.toHaveBeenCalled();
  });

  it('refuses an Investigation with no hunt session', async () => {
    const { run, management } = setup();

    await expect(run()).rejects.toMatchObject({ code: 'no_hunt_session' });
    expect(management.executeLabeledWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown hunt', { definition: { ...header.definition, id: 'gone_hunt' } }],
    ['a changed hunt version', { definition: { ...header.definition, version: 99 } }],
  ])('refuses a session for %s', async (_label, change) => {
    const { run } = setup({ stored: { ...manual, ...change } });

    await expect(run()).rejects.toMatchObject({ code: 'definition_changed' });
  });
});
