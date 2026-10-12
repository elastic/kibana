/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { MAX_COMMENT_LENGTH } from '@kbn/proposals-common';
import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import {
  buildConvergenceNote,
  buildInvestigationLink,
  createAlsoRaisedByAppender,
} from './converge_on_live_proposal';
import type { LiveProposal } from './resolve_proposal_slot';

const SPACE = 'default';
const THIS_RUN = 'conv-this';
const request = httpServerMock.createKibanaRequest();

const live = (overrides: Partial<LiveProposal> = {}): LiveProposal => ({
  proposalId: 'proposal-head',
  conversationId: 'conv-owner',
  title: 'Isolate host A',
  comment: 'Isolate host A.',
  revisable: true,
  ...overrides,
});

const createService = () => ({
  revise: jest.fn().mockResolvedValue({ proposalId: 'proposal-next', revision: 2 }),
  getLatestRevision: jest.fn(),
  get: jest.fn(),
});

const appender = (service: ReturnType<typeof createService>, spaceId = SPACE) => {
  const logger = loggerMock.create();
  return {
    logger,
    append: createAlsoRaisedByAppender({
      proposalsService: service as never,
      spaceId,
      request,
      logger,
    }),
  };
};

describe('buildInvestigationLink', () => {
  it('is the link the conversations page already copies', () => {
    expect(buildInvestigationLink({ spaceId: 'default', conversationId: 'conv-1' })).toBe(
      '/app/alertzero?selectedConversationId=conv-1'
    );
  });

  it('carries the space, or the link opens the wrong one', () => {
    expect(buildInvestigationLink({ spaceId: 'sec', conversationId: 'conv-1' })).toBe(
      '/s/sec/app/alertzero?selectedConversationId=conv-1'
    );
  });

  it('encodes the id', () => {
    expect(buildInvestigationLink({ spaceId: 'default', conversationId: 'a b&c' })).toBe(
      '/app/alertzero?selectedConversationId=a%20b%26c'
    );
  });
});

describe('createAlsoRaisedByAppender', () => {
  it('appends one line naming this Investigation, through a revision of the live head', async () => {
    const service = createService();
    const { append } = appender(service);

    const outcome = await append({ live: live(), investigationConversationId: THIS_RUN });

    expect(outcome).toBe('revised');
    expect(service.revise).toHaveBeenCalledTimes(1);
    expect(service.revise).toHaveBeenCalledWith(
      {
        id: 'proposal-head',
        comment:
          'Isolate host A.\n\nAlso raised by [Investigation](/app/alertzero?selectedConversationId=conv-this).',
      },
      SPACE,
      request
    );
  });

  it('uses the space in the link it writes', async () => {
    const service = createService();
    const { append } = appender(service, 'sec');

    await append({ live: live(), investigationConversationId: THIS_RUN });

    expect(service.revise.mock.calls[0][0].comment).toContain(
      '(/s/sec/app/alertzero?selectedConversationId=conv-this)'
    );
  });

  describe('skips, without failing, when there is nothing to add', () => {
    it('is this Investigation’s own proposal: a rerun landing on it is not news', async () => {
      const service = createService();
      const { append } = appender(service);

      const outcome = await append({
        live: live({ conversationId: THIS_RUN }),
        investigationConversationId: THIS_RUN,
      });

      expect(outcome).toBe('same_investigation');
      expect(service.revise).not.toHaveBeenCalled();
    });

    it('has been decided: revise() refuses a decided proposal', async () => {
      const service = createService();
      const { append } = appender(service);

      const outcome = await append({
        live: live({ revisable: false }),
        investigationConversationId: THIS_RUN,
      });

      expect(outcome).toBe('not_revisable');
      expect(service.revise).not.toHaveBeenCalled();
    });

    it('already names this Investigation', async () => {
      const service = createService();
      const { append } = appender(service);

      const outcome = await append({
        live: live({
          comment: `Isolate host A.\n\nAlso raised by [Investigation](/x?id=${THIS_RUN}).`,
        }),
        investigationConversationId: THIS_RUN,
      });

      expect(outcome).toBe('already_mentioned');
      expect(service.revise).not.toHaveBeenCalled();
    });

    it('would not fit under the comment length the service allows', async () => {
      const service = createService();
      const { append } = appender(service);

      const outcome = await append({
        live: live({ comment: 'x'.repeat(MAX_COMMENT_LENGTH - 10) }),
        investigationConversationId: THIS_RUN,
      });

      expect(outcome).toBe('too_long');
      expect(service.revise).not.toHaveBeenCalled();
    });
  });

  describe('when a concurrent revision or decision wins (a 409)', () => {
    const conflict = () => new ProposalConflictError('superseded');

    it('reloads the live revision and its comment, and tries once more', async () => {
      const service = createService();
      service.revise.mockRejectedValueOnce(conflict());
      service.getLatestRevision.mockResolvedValue({
        proposalId: 'proposal-newer',
        revision: 3,
        status: 'pending',
        decision: undefined,
      });
      service.get.mockResolvedValue({ comment: 'Isolate host A.\n\nAlso raised by someone else.' });
      const { append } = appender(service);

      const outcome = await append({ live: live(), investigationConversationId: THIS_RUN });

      expect(outcome).toBe('revised');
      expect(service.revise).toHaveBeenCalledTimes(2);
      expect(service.revise).toHaveBeenLastCalledWith(
        {
          id: 'proposal-newer',
          comment:
            'Isolate host A.\n\nAlso raised by someone else.\n\nAlso raised by [Investigation](/app/alertzero?selectedConversationId=conv-this).',
        },
        SPACE,
        request
      );
    });

    it('does not retry into a proposal that was decided in the meantime', async () => {
      const service = createService();
      service.revise.mockRejectedValueOnce(conflict());
      service.getLatestRevision.mockResolvedValue({
        proposalId: 'proposal-head',
        revision: 1,
        status: 'pending',
        decision: 'approved',
      });
      service.get.mockResolvedValue({ comment: 'Isolate host A.' });
      const { append } = appender(service);

      const outcome = await append({ live: live(), investigationConversationId: THIS_RUN });

      expect(outcome).toBe('not_revisable');
      expect(service.revise).toHaveBeenCalledTimes(1);
    });

    it('gives up after one retry, and does not throw', async () => {
      const service = createService();
      service.revise.mockRejectedValue(conflict());
      service.getLatestRevision.mockResolvedValue({
        proposalId: 'proposal-newer',
        revision: 3,
        status: 'pending',
        decision: undefined,
      });
      service.get.mockResolvedValue({ comment: 'Isolate host A.' });
      const { append, logger } = appender(service);

      const outcome = await append({ live: live(), investigationConversationId: THIS_RUN });

      expect(outcome).toBe('failed');
      expect(service.revise).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  it('reports a refusal that is not a conflict as failed, without retrying or throwing', async () => {
    const service = createService();
    service.revise.mockRejectedValue(new Error('forbidden'));
    const { append, logger } = appender(service);

    const outcome = await append({ live: live(), investigationConversationId: THIS_RUN });

    expect(outcome).toBe('failed');
    expect(service.revise).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });
});

describe('buildConvergenceNote', () => {
  const link = '/app/alertzero?selectedConversationId=conv-owner';

  it('says nothing when the proposal is this Investigation’s own', () => {
    expect(
      buildConvergenceNote({ spaceId: SPACE, live: live(), outcome: 'same_investigation' })
    ).toBeUndefined();
  });

  it('names the proposal and links the Investigation that holds it', () => {
    const note = buildConvergenceNote({ spaceId: SPACE, live: live(), outcome: 'revised' });

    expect(note).toContain('"Isolate host A"');
    expect(note).toContain('already awaiting a decision');
    expect(note).toContain(`(${link})`);
    expect(note).toContain('no second Proposal was created');
  });

  it.each(['revised', 'already_mentioned'] as const)(
    'says this Investigation was added to it when the outcome is %s',
    (outcome) => {
      expect(buildConvergenceNote({ spaceId: SPACE, live: live(), outcome })).toContain(
        'This Investigation was added to it.'
      );
    }
  );

  it.each(['too_long', 'failed'] as const)(
    'does not claim it was added when the outcome is %s',
    (outcome) => {
      expect(buildConvergenceNote({ spaceId: SPACE, live: live(), outcome })).not.toContain(
        'added to it'
      );
    }
  );

  it('says it was already approved when an analyst has decided it, and never claims to have added to it', () => {
    const note = buildConvergenceNote({
      spaceId: SPACE,
      live: live({ revisable: false }),
      outcome: 'not_revisable',
    });

    expect(note).toContain('has already been approved');
    expect(note).not.toContain('awaiting a decision');
    expect(note).not.toContain('added to it');
  });

  it('links the space the Investigation is in', () => {
    expect(buildConvergenceNote({ spaceId: 'sec', live: live(), outcome: 'revised' })).toContain(
      '(/s/sec/app/alertzero?selectedConversationId=conv-owner)'
    );
  });
});
