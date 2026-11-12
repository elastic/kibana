/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { fixtureInputs } from './__fixtures__/forensics_summary_inputs';
import { getForensicsAttachmentIds } from './constants';
import { renderForensicsSummaryHtml } from './render_forensics_summary_html';
import type { RunForensicsSummaryDeps } from './run_forensics_summary';
import { describeForensicsSummary, runForensicsSummary } from './run_forensics_summary';
import type { ForensicsProposal } from './types';
import { buildForensicsSummaryViewModel } from './view_model';

const KI_ID = 'ki-1';
const CONVERSATION_ID = 'investigation-1';
const ids = getForensicsAttachmentIds(KI_ID);
const request = {} as KibanaRequest;

const versioned = (
  id: string,
  data: unknown,
  description?: string,
  active?: boolean
): VersionedAttachment => ({
  id,
  type: 'test',
  current_version: 1,
  description,
  ...(active === undefined ? {} : { active }),
  versions: [{ version: 1, data, created_at: '2026-11-02T10:00:00Z', content_hash: 'h' }],
});

const evidenceAttachments = (): VersionedAttachment[] => [
  versioned(ids.timeline, fixtureInputs.timeline),
  versioned(ids.iocs, fixtureInputs.iocs),
  versioned('attack-discovery', {
    title: 'Ransomware on {{ host.name win-fin-07 }}',
    alert_ids: ['a1', 'a2', 'a3'],
    mitre_attack_tactics: fixtureInputs.attack?.tactics,
  }),
];

const alertHit = (ruleName: string, severity: string, riskScore: number) => ({
  _id: ruleName,
  _index: '.alerts',
  fields: {
    'kibana.alert.rule.name': [ruleName],
    'kibana.alert.severity': [severity],
    'kibana.alert.risk_score': [riskScore],
  },
});

const setup = ({
  indicator = true,
  attachments = evidenceAttachments(),
  proposals = fixtureInputs.proposals,
}: {
  indicator?: boolean;
  attachments?: VersionedAttachment[];
  proposals?: readonly ForensicsProposal[];
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockImplementation((async (params: { index: string }) => {
    if (params.index.startsWith('ai-index-idx-')) {
      return {
        hits: {
          hits: indicator
            ? [
                {
                  _id: 'doc-1',
                  _index: params.index,
                  _source: {
                    id: KI_ID,
                    updated_at: '2026-11-02T10:15:00.000Z',
                    attributes: { forensic_verdict: 'confirmed_incident', autonomy: 'manual' },
                  },
                },
              ]
            : [],
        },
      };
    }
    return {
      hits: {
        hits: [
          alertHit('LSASS memory dump', 'critical', 99),
          alertHit('Ransomware behavior', 'critical', 95),
          alertHit('Suspicious PowerShell', 'high', 73),
        ],
      },
    };
  }) as unknown as ElasticsearchClient['search']);

  const attachmentsClient = {
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const deps: RunForensicsSummaryDeps = {
    getConversationClient: async () => ({
      get: async () => ({ metadata: { summary: fixtureInputs.summary ?? '' }, attachments }),
    }),
    getAttachmentsClient: async () => attachmentsClient,
    listProposals: jest.fn().mockResolvedValue(proposals),
    logger: loggingSystemMock.createLogger(),
  };
  const run = (abortSignal?: AbortSignal) =>
    runForensicsSummary({
      request,
      spaceId: 'default',
      conversationId: CONVERSATION_ID,
      esClient,
      abortSignal,
      deps,
    });
  return { esClient, attachmentsClient, deps, run };
};

/** The card as this run would render it from the fixture. */
const expectedCard = (proposals = fixtureInputs.proposals, summary = fixtureInputs.summary) => {
  const viewModel = buildForensicsSummaryViewModel({
    ...fixtureInputs,
    attack: {
      title: 'Ransomware on win-fin-07',
      tactics: fixtureInputs.attack?.tactics ?? [],
      alertIds: ['a1', 'a2', 'a3'],
    },
    proposals,
    summary,
  });
  const { html, height } = renderForensicsSummaryHtml(viewModel);
  return {
    data: {
      renderer: 'custom_content',
      query: 'Forensics summary',
      visualization: { template: html, height, title: 'Forensics summary' },
    },
    description: describeForensicsSummary(viewModel),
  };
};

describe('runForensicsSummary', () => {
  it('writes nothing when the Investigation has no finished Endpoint Analysis', async () => {
    const { run, attachmentsClient, deps } = setup({ indicator: false });
    await expect(run()).resolves.toEqual({ skipped: true, reason: 'no_analysis' });
    expect(deps.listProposals).not.toHaveBeenCalled();
    expect(attachmentsClient.create).not.toHaveBeenCalled();
  });

  it('only searches the space and Investigation it was asked about', async () => {
    const { run, esClient } = setup({ indicator: false });
    await run();
    const filters = JSON.stringify(esClient.search.mock.calls[0][0]);
    expect(filters).toContain('"attributes.space_id":"default"');
    expect(filters).toContain(`"attributes.investigation_id":"${CONVERSATION_ID}"`);
    expect(filters).toContain('"attributes.status":"processed"');
  });

  it('adds the card, shown in the chat, the first time', async () => {
    const { run, attachmentsClient } = setup();
    await expect(run()).resolves.toEqual({
      skipped: false,
      attachment_id: ids.summary,
      action: 'created',
    });
    const { data, description } = expectedCard();
    expect(attachmentsClient.create).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      id: ids.summary,
      type: 'visualization',
      data,
      description,
      render_inline: true,
      access: 'converse',
    });
  });

  it('skips the write when the card is already current', async () => {
    const { data, description } = expectedCard();
    const { run, attachmentsClient } = setup({
      attachments: [...evidenceAttachments(), versioned(ids.summary, data, description)],
    });
    await expect(run()).resolves.toEqual({
      skipped: true,
      reason: 'unchanged',
      attachment_id: ids.summary,
    });
    expect(attachmentsClient.create).not.toHaveBeenCalled();
  });

  // The posted card starts a summary run, whose model text differs every time. Posting again for it
  // would start another run, and so on for ever.
  it('leaves the card alone when only the summary was reworded', async () => {
    const reworded = expectedCard(fixtureInputs.proposals, 'The same story, told another way.');
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, reworded.data, reworded.description),
      ],
    });
    await expect(run()).resolves.toEqual({
      skipped: true,
      reason: 'summary_only',
      attachment_id: ids.summary,
    });
    expect(attachmentsClient.create).not.toHaveBeenCalled();
    expect(attachmentsClient.delete).not.toHaveBeenCalled();
  });

  it('posts the card again when the first summary arrives', async () => {
    const noSummary = expectedCard(fixtureInputs.proposals, '');
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, noSummary.data, noSummary.description),
      ],
    });
    await expect(run()).resolves.toMatchObject({ action: 'reposted' });
    expect(attachmentsClient.create).toHaveBeenCalledTimes(1);
  });

  it('posts the card again when the summary changed along with something else', async () => {
    const before = expectedCard([], 'The same story, told another way.');
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description),
      ],
    });
    await expect(run()).resolves.toMatchObject({ action: 'reposted' });
    expect(attachmentsClient.create).toHaveBeenCalledTimes(1);
  });

  it('posts the card again when what changed is not a decision', async () => {
    const { data, description } = expectedCard();
    const stale = { ...data, visualization: { ...data.visualization, template: '<p>older</p>' } };
    const { run, attachmentsClient } = setup({
      attachments: [...evidenceAttachments(), versioned(ids.summary, stale, description)],
    });
    await expect(run()).resolves.toMatchObject({
      attachment_id: `${ids.summary}-2`,
      action: 'reposted',
    });
    expectReposted(
      attachmentsClient,
      `${ids.summary}-2`,
      [ids.summary],
      '1 awaiting, 1 done, 1 closed'
    );
  });

  /** Asserts the card was posted again as the given id and the cards before it were deleted. */
  const expectReposted = (
    attachmentsClient: ReturnType<typeof setup>['attachmentsClient'],
    attachmentId: string,
    deleted: string[],
    decisions: string
  ) => {
    expect(attachmentsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: attachmentId,
        render_inline: true,
        description: expect.stringContaining(`decisions: ${decisions}`),
      })
    );
    expect(attachmentsClient.delete.mock.calls).toEqual(
      deleted.map((id) => [{ conversationId: CONVERSATION_ID, attachmentId: id }])
    );
    // Posted before the older card goes, so the chat never shows no card.
    expect(attachmentsClient.create.mock.invocationCallOrder[0]).toBeLessThan(
      attachmentsClient.delete.mock.invocationCallOrder[0]
    );
  };

  it('posts the card again in place of the old one when proposals are raised', async () => {
    const before = expectedCard([]);
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description),
      ],
    });
    expect(before.description).toContain('decisions: none');
    await expect(run()).resolves.toEqual({
      skipped: false,
      attachment_id: `${ids.summary}-2`,
      action: 'reposted',
    });
    expectReposted(
      attachmentsClient,
      `${ids.summary}-2`,
      [ids.summary],
      '1 awaiting, 1 done, 1 closed'
    );
  });

  it('posts the card again when a decision is made, even with others still open', async () => {
    const open = fixtureInputs.proposals.map((proposal) => ({
      ...proposal,
      status: 'pending' as const,
    }));
    const before = expectedCard(open);
    const oneDismissed = open.map((proposal, index) =>
      index === 0 ? { ...proposal, status: 'no_action' as const, decision: 'dismissed' } : proposal
    );
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description),
      ],
      proposals: oneDismissed,
    });
    await run();
    expectReposted(attachmentsClient, `${ids.summary}-2`, [ids.summary], '2 awaiting, 1 closed');
  });

  it('posts the card again once the last open decision settles', async () => {
    const before = expectedCard();
    const decided = fixtureInputs.proposals.map((proposal) => ({
      ...proposal,
      status: 'succeeded' as const,
    }));
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description, false),
        versioned(`${ids.summary}-2`, before.data, before.description),
      ],
      proposals: decided,
    });
    await run();
    expectReposted(attachmentsClient, `${ids.summary}-3`, [`${ids.summary}-2`], '3 done');
  });

  it('replaces the newest card, and never reuses the id of a deleted one', async () => {
    const { data, description } = expectedCard();
    const stale = { ...data, visualization: { ...data.visualization, template: '<p>older</p>' } };
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, stale, description, false),
        versioned(`${ids.summary}-2`, stale, description),
        versioned(`${ids.summary}-other`, stale, description),
      ],
    });
    await expect(run()).resolves.toMatchObject({
      attachment_id: `${ids.summary}-3`,
      action: 'reposted',
    });
    expectReposted(
      attachmentsClient,
      `${ids.summary}-3`,
      [`${ids.summary}-2`],
      '1 awaiting, 1 done, 1 closed'
    );
  });

  it('posts a new card when every card was deleted', async () => {
    const { data, description } = expectedCard();
    const { run, attachmentsClient } = setup({
      attachments: [...evidenceAttachments(), versioned(ids.summary, data, description, false)],
    });
    await expect(run()).resolves.toEqual({
      skipped: false,
      attachment_id: `${ids.summary}-2`,
      action: 'created',
    });
    expect(attachmentsClient.delete).not.toHaveBeenCalled();
  });

  it('deletes every older card, and logs one it could not delete without failing', async () => {
    const before = expectedCard([]);
    const { run, attachmentsClient, deps } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description),
        versioned(`${ids.summary}-2`, before.data, before.description),
      ],
    });
    attachmentsClient.delete.mockRejectedValueOnce(new Error('conflict'));
    await expect(run()).resolves.toMatchObject({ action: 'reposted' });
    expectReposted(
      attachmentsClient,
      `${ids.summary}-3`,
      [ids.summary, `${ids.summary}-2`],
      '1 awaiting, 1 done, 1 closed'
    );
    expect(deps.logger?.warn).toHaveBeenCalledWith(expect.stringContaining('conflict'));
  });

  it('writes nothing when a newer run cancels it while it reads', async () => {
    const controller = new AbortController();
    const { run, attachmentsClient, deps } = setup();
    // Cancelled while the proposals, which take no signal, are being read.
    (deps.listProposals as jest.Mock).mockImplementation(async () => {
      controller.abort();
      return fixtureInputs.proposals;
    });
    await expect(run(controller.signal)).resolves.toEqual({ skipped: true, reason: 'cancelled' });
    expect(attachmentsClient.create).not.toHaveBeenCalled();
  });

  it('passes the abort signal to its searches', async () => {
    const controller = new AbortController();
    const { run, esClient } = setup();
    await run(controller.signal);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    for (const [, options] of esClient.search.mock.calls) {
      expect(options).toEqual({ signal: controller.signal });
    }
  });
});
