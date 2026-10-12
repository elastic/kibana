/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  MessageRole,
  createInferenceRequestError,
  ChatCompletionErrorCode,
  InferenceTaskError,
} from '@kbn/inference-common';
import { FIXTURE_BRIEF } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { assessAttention } from '../assessment';
import { BriefJobError, toJobError } from '../job/job_errors';
import { LLM_RUN_SNAPSHOT } from '../validation/__fixtures__/llm_sonnet5_names_run';
import { validateBrief } from '../validation/validate_brief';
import { BRIEF_OUTPUT_SCHEMA, BRIEF_SYSTEM_PROMPT, buildBriefPayload } from './brief_prompt';
import { buildBriefInput, estimateBriefPrompt } from './brief_request';
import {
  EXECUTIVE_BRIEF_INFERENCE_ID,
  InferenceBriefGenerator,
  sumTokens,
} from './inference_brief_generator';
import type {
  BriefChatCompleteClient,
  BriefChatCompleteRequest,
} from './inference_brief_generator';

const clientReturning = (output: object | undefined, tokens?: ChatCompletionTokenCount) => {
  const calls: BriefChatCompleteRequest[] = [];
  const client: BriefChatCompleteClient = {
    chatComplete: jest.fn(async (request: BriefChatCompleteRequest) => {
      calls.push(request);
      return {
        toolCalls: output ? [{ function: { name: 'structuredOutput', arguments: output } }] : [],
        tokens,
      };
    }),
  };
  return { client, calls };
};

const validationError = () =>
  new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, 'bad tool call', {
    toolCalls: [
      {
        toolCallId: 'call-1',
        function: { name: 'structuredOutput', arguments: '{"glance":1}' },
      },
    ],
  });

describe('InferenceBriefGenerator (mocked inference client)', () => {
  it('calls chatComplete() once with a single forced tool, the prompt, schema and abort signal', async () => {
    const { client, calls } = clientReturning(FIXTURE_BRIEF);
    const controller = new AbortController();
    const generator = new InferenceBriefGenerator(client, 'my-connector');
    const result = await generator.generate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
      abortSignal: controller.signal,
    });

    expect(calls).toHaveLength(1);
    expect(EXECUTIVE_BRIEF_INFERENCE_ID).toBe('ea-executive-brief-poc');
    expect(calls[0]).toMatchObject({
      system: BRIEF_SYSTEM_PROMPT,
      toolChoice: { function: 'structuredOutput' },
      abortSignal: controller.signal,
    });
    expect(Object.keys(calls[0].tools)).toEqual(['structuredOutput']);
    expect(calls[0].tools.structuredOutput.schema).toBe(BRIEF_OUTPUT_SCHEMA);
    expect(calls[0].tools.structuredOutput.schema.required).toEqual([
      'glance',
      'storylines',
      'blindSpots',
      'decisions',
    ]);
    expect(calls[0].messages).toEqual([
      {
        role: MessageRole.User,
        content: expect.stringContaining(buildBriefPayload(FIXTURE_SNAPSHOT, 'names')),
      },
    ]);
    expect(result.attempts).toBe(1);
    expect(result.tokens).toBeUndefined();
    expect(result.model).toBe('my-connector');
    expect(result.brief).toEqual(FIXTURE_BRIEF);
  });

  it('returns output that the validator accepts when the model behaves', async () => {
    const { client } = clientReturning(FIXTURE_BRIEF);
    const { brief } = await new InferenceBriefGenerator(client).generate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
    });
    expect(validateBrief({ brief, snapshot: FIXTURE_SNAPSHOT }).validation.droppedClaims).toBe(0);
  });

  it('keeps model mistakes intact for the validator to catch (no silent repair)', async () => {
    const { client } = clientReturning({
      ...FIXTURE_BRIEF,
      glance: { ...FIXTURE_BRIEF.glance, threatNarrative: '57 hosts', evidence: ['STORY-99'] },
    });
    const { brief } = await new InferenceBriefGenerator(client).generate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
    });
    const { validation } = validateBrief({ brief, snapshot: FIXTURE_SNAPSHOT });
    expect(validation.invalidEvidenceIds).toEqual(['STORY-99']);
    expect(validation.inventedNumbers).toEqual(['57']);
  });

  it('accepts a missing optional conclusion and owner', async () => {
    const { crossStorylineConclusion: _omit, ...rest } = FIXTURE_BRIEF;
    const { owner: _owner, ...decision } = FIXTURE_BRIEF.decisions[0];
    const { client } = clientReturning({ ...rest, decisions: [{ ...decision, owner: null }] });
    const { brief } = await new InferenceBriefGenerator(client).generate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
    });
    expect(brief.crossStorylineConclusion).toBeUndefined();
    expect(brief.decisions[0].owner).toBeUndefined();
  });

  describe('malformed output is an llm_output error', () => {
    const generate = (output: object | undefined) =>
      new InferenceBriefGenerator(clientReturning(output).client).generate({
        snapshot: FIXTURE_SNAPSHOT,
        mode: 'names',
      });

    it.each([
      ['undefined output', undefined, 'output'],
      ['missing glance', { ...FIXTURE_BRIEF, glance: undefined }, 'glance'],
      [
        'non-string headline',
        { ...FIXTURE_BRIEF, glance: { ...FIXTURE_BRIEF.glance, headline: 4 } },
        'glance.headline',
      ],
      [
        'unknown confidence',
        {
          ...FIXTURE_BRIEF,
          storylines: [{ ...FIXTURE_BRIEF.storylines[0], confidence: 'certain' }],
        },
        'storylines[0].confidence',
      ],
      [
        'evidence not an array',
        { ...FIXTURE_BRIEF, blindSpots: { summary: 's', evidence: 'ENT-1' } },
        'blindSpots.evidence',
      ],
      [
        'evidence item not a string',
        { ...FIXTURE_BRIEF, blindSpots: { summary: 's', evidence: [1] } },
        'blindSpots.evidence[0]',
      ],
      [
        'unknown urgency',
        { ...FIXTURE_BRIEF, decisions: [{ ...FIXTURE_BRIEF.decisions[0], urgency: 'asap' }] },
        'decisions[0].urgency',
      ],
      [
        'unknown owner',
        { ...FIXTURE_BRIEF, decisions: [{ ...FIXTURE_BRIEF.decisions[0], owner: 'ceo' }] },
        'decisions[0].owner',
      ],
    ])('%s', async (_name, output, path) => {
      const error = await generate(output).catch((e: Error) => e);
      expect(error).toBeInstanceOf(BriefJobError);
      expect(toJobError(error)).toEqual({
        code: 'llm_output',
        message: expect.stringContaining(path),
      });
    });
  });

  it('lets connector errors through unchanged so the job maps them to connector', async () => {
    const client: BriefChatCompleteClient = {
      chatComplete: jest.fn(async () => {
        throw createInferenceRequestError('no such connector', 404);
      }),
    };
    const error = await new InferenceBriefGenerator(client)
      .generate({ snapshot: FIXTURE_SNAPSHOT, mode: 'names' })
      .catch((e: Error) => e);
    expect(toJobError(error).code).toBe('connector');
  });
});

describe('token usage, attempts and retry', () => {
  const generator = (client: BriefChatCompleteClient) => new InferenceBriefGenerator(client);
  const run = (client: BriefChatCompleteClient) =>
    generator(client).generate({ snapshot: FIXTURE_SNAPSHOT, mode: 'names' });

  it('returns the response tokens, including cached', async () => {
    const { client } = clientReturning(FIXTURE_BRIEF, {
      prompt: 1000,
      completion: 200,
      total: 1200,
      cached: 400,
    });
    expect(await run(client)).toMatchObject({
      tokens: { prompt: 1000, completion: 200, total: 1200, cached: 400 },
      attempts: 1,
    });
  });

  it('leaves optional fields undefined when the provider does not report them', async () => {
    const { client } = clientReturning(FIXTURE_BRIEF, { prompt: 10, completion: 5, total: 15 });
    const { tokens } = await run(client);
    expect(tokens).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(tokens).not.toHaveProperty('cached');
  });

  it('retries once on a tool validation error, with the failed call and its error in the conversation', async () => {
    const calls: BriefChatCompleteRequest[] = [];
    const responses: Array<() => ReturnType<BriefChatCompleteClient['chatComplete']>> = [
      () => Promise.reject(validationError()),
      async () => ({
        toolCalls: [{ function: { name: 'structuredOutput', arguments: FIXTURE_BRIEF } }],
        tokens: { prompt: 900, completion: 100, total: 1000, cached: 50 },
      }),
    ];
    const client: BriefChatCompleteClient = {
      chatComplete: jest.fn((request: BriefChatCompleteRequest) => {
        calls.push(request);
        return (responses.shift() as () => ReturnType<BriefChatCompleteClient['chatComplete']>)();
      }),
    };
    const result = await run(client);
    expect(result.attempts).toBe(2);
    expect(result.brief).toEqual(FIXTURE_BRIEF);
    expect(calls).toHaveLength(2);
    expect(calls[1].messages.map((message) => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
      MessageRole.Tool,
    ]);
    // Only the successful attempt reports usage (a failed attempt's usage is not on the error).
    expect(result.tokens).toEqual({ prompt: 900, completion: 100, total: 1000, cached: 50 });
  });

  it('sums usage across attempts, keeping undefined fields undefined', () => {
    expect(sumTokens(undefined, undefined)).toBeUndefined();
    expect(sumTokens(undefined, { prompt: 10, completion: 5, total: 15 })).toEqual({
      prompt: 10,
      completion: 5,
      total: 15,
    });
    expect(
      sumTokens(
        { prompt: 10, completion: 5, total: 15 },
        { prompt: 20, completion: 6, total: 26, cached: 8 }
      )
    ).toEqual({ prompt: 30, completion: 11, total: 41, cached: 8 });
  });

  it('throws after the single retry also fails validation', async () => {
    const client: BriefChatCompleteClient = {
      chatComplete: jest.fn(() => Promise.reject(validationError())),
    };
    const error = await run(client).catch((e: Error) => e);
    expect(client.chatComplete).toHaveBeenCalledTimes(2);
    expect(toJobError(error).code).toBe('llm_output');
  });

  it('does not retry malformed output (the same as output(): only validation errors retry)', async () => {
    const { client } = clientReturning({ ...FIXTURE_BRIEF, glance: undefined });
    await expect(run(client)).rejects.toBeInstanceOf(BriefJobError);
    expect(client.chatComplete).toHaveBeenCalledTimes(1);
  });
});

describe('estimate', () => {
  it('counts payload bytes of the exact input and a positive token count', () => {
    const estimate = new InferenceBriefGenerator(clientReturning(FIXTURE_BRIEF).client).estimate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
    });
    expect(estimate).toEqual({
      promptTokens: expect.any(Number),
      payloadBytes: Buffer.byteLength(buildBriefInput(FIXTURE_SNAPSHOT, 'names'), 'utf8'),
      method: 'tokenizer',
    });
    expect(estimate?.promptTokens).toBeGreaterThan(estimate ? estimate.payloadBytes / 8 : 0);
  });

  it('ids_only is smaller than names', () => {
    const names = estimateBriefPrompt(FIXTURE_SNAPSHOT, 'names');
    const idsOnly = estimateBriefPrompt(FIXTURE_SNAPSHOT, 'ids_only');
    expect(idsOnly.payloadBytes).toBeLessThan(names.payloadBytes);
  });
});

describe('buildBriefPayload', () => {
  const names = Object.values(FIXTURE_SNAPSHOT.entities).map((entity) => entity.name);

  it('names mode carries display names and ENT ids, but never euids', () => {
    const payload = buildBriefPayload(FIXTURE_SNAPSHOT, 'names');
    names.forEach((name) => expect(payload).toContain(name));
    expect(payload).toContain('ENT-1');
    expect(payload).not.toContain('user:a.rodriguez@acme.com@okta');
  });

  it('ids_only mode contains no display name, euid or alias anywhere, even in event text', () => {
    const payload = buildBriefPayload(FIXTURE_SNAPSHOT, 'ids_only').toLowerCase();
    names.forEach((name) => expect(payload).not.toContain(name.toLowerCase()));
    Object.values(FIXTURE_SNAPSHOT.entities).forEach((entity) => {
      expect(payload).not.toContain(entity.euid.toLowerCase());
      entity.aliases.forEach((alias) => expect(payload).not.toContain(alias.toLowerCase()));
    });
    // The event summary "...on LAPTOP-FIN03" is rewritten with the entity id instead.
    expect(payload).toContain('lsass memory access\\" on ent-2');
  });

  it('gives every storyline edge its allowed verb and lists failed sources as data gaps', () => {
    const payload = JSON.parse(
      buildBriefPayload(
        {
          ...FIXTURE_SNAPSHOT,
          sources: { ...FIXTURE_SNAPSHOT.sources, posture: { status: 'timeout', tookMs: 1 } },
        },
        'names'
      )
    );
    expect(payload.storylines[2].edges[1]).toMatchObject({
      type: 'communicates_with',
      allowedVerb: 'regularly logs on to',
    });
    expect(payload.dataGaps.map((g: { source: string }) => g.source)).toEqual(
      expect.arrayContaining(['posture', 'anomalies'])
    );
  });
});

describe('brief prompt and schema (D8, V5)', () => {
  const decisionSchema = (() => {
    const decisions = BRIEF_OUTPUT_SCHEMA.properties.decisions.items;
    return decisions;
  })();

  it('requires an owner on every decision', () => {
    expect(decisionSchema.required).toContain('owner');
    expect(decisionSchema.properties.owner.enum).toEqual([
      'soc',
      'it',
      'iam',
      'cloud',
      'detection_engineering',
      'leadership',
    ]);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/MUST have an "owner"/);
  });

  it('forbids placeholder and invented evidence ids and asks to omit instead', () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/Never write a placeholder or invented id/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/leave it out of the array instead of inventing one/);
    expect(JSON.stringify(BRIEF_OUTPUT_SCHEMA)).toMatch(
      /Never a placeholder; omit rather than invent/
    );
  });

  it('asks for a concise style: narrative of at most 3 sentences, title of at most 70 characters', () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/at most 3 sentences/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/at most 10 words and 70 characters/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/written as what happened/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/never a template such as "X to Y activity"/);
    expect(BRIEF_OUTPUT_SCHEMA.properties.storylines.items.properties.title.description).toMatch(
      /70 characters/
    );
    expect(
      BRIEF_OUTPUT_SCHEMA.properties.storylines.items.properties.narrative.description
    ).toMatch(/3 sentences/);
  });

  it('encourages one cross-storyline conclusion that cites the storylines it compares', () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/exactly one cross-storyline conclusion/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/cite each STORY-\* id it compares/);
    expect(BRIEF_OUTPUT_SCHEMA.properties.crossStorylineConclusion.description).toMatch(
      /cites each STORY-\* id/
    );
    // It stays optional in the schema: the data may support none.
    expect(BRIEF_OUTPUT_SCHEMA.required).not.toContain('crossStorylineConclusion');
  });

  it('allows listing entities but not verbs between unlinked entities', () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/Listing the entities of a storyline is fine/);
  });
});

describe('assessment in the prompt and payload', () => {
  const snapshot: BriefSnapshot = {
    ...LLM_RUN_SNAPSHOT,
    glance: { ...LLM_RUN_SNAPSHOT.glance, assessment: assessAttention(LLM_RUN_SNAPSHOT) },
  };

  it('puts the level, every area summary, rule and evidence, and the trend in the payload', () => {
    const payload = JSON.parse(buildBriefPayload(snapshot, 'names'));
    expect(payload.attentionAssessment.level).toBe('urgent');
    expect(payload.attentionAssessment.trend).toBe('more');
    expect(payload.attentionAssessment.areas.map((a: { id: string }) => a.id)).toEqual([
      'threats',
      'response',
      'coverage',
      'visibility',
    ]);
    expect(payload.attentionAssessment.areas[1]).toEqual({
      id: 'response',
      level: 'action',
      summary: '9 high/critical alerts have no case',
      rule: expect.any(String),
      evidence: ['GAP-B17'],
    });
  });

  it('is sent to the model by the generator', async () => {
    const { client, calls } = clientReturning(FIXTURE_BRIEF);
    await new InferenceBriefGenerator(client).generate({ snapshot, mode: 'names' });
    expect((calls[0].messages[0] as { content: string }).content).toContain(
      '"attentionAssessment":{"level":"urgent"'
    );
    expect((calls[0].messages[0] as { content: string }).content).toContain(
      '9 high/critical alerts have no case'
    );
  });

  it('omits it for a snapshot without an assessment instead of inventing one', () => {
    expect(JSON.parse(buildBriefPayload(LLM_RUN_SNAPSHOT, 'names'))).not.toHaveProperty(
      'attentionAssessment'
    );
  });

  it('asks for a one-sentence headline of at most 140 characters, a narrative of at most 2 sentences, and never the level label', () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/ONE sentence of at most 140 characters/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/at most 2 sentences/);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/never write the level label itself/);
    const { headline, threatNarrative } = BRIEF_OUTPUT_SCHEMA.properties.glance.properties;
    expect(headline.description).toMatch(/ONE sentence, at most 140 characters/);
    expect(headline.description).toMatch(/Never state the level label/);
    expect(threatNarrative.description).toBe('At most 2 sentences');
    expect(BRIEF_OUTPUT_SCHEMA.properties.glance.required).toEqual([
      'headline',
      'threatNarrative',
      'evidence',
    ]);
  });
});

describe('buildBriefPayload: no raw UUIDs (V4)', () => {
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const caseUuid = '6ac716c0-7062-4941-a710-3ad055ef71db';
  const adUuid = '2ac34749-ad66-49eb-b463-4c44381c4b13';
  const leadUuid = '0e5e2a70-3a3d-4d6c-8f6f-5c1c6b3a9a11';

  const snapshot = {
    ...FIXTURE_SNAPSHOT,
    catalog: {
      ...FIXTURE_SNAPSHOT.catalog,
      'CASE-1': {
        kind: 'case' as const,
        caseId: caseUuid,
        title: 'Marketing takeover',
        status: 'open' as const,
      },
      'AD-1': {
        kind: 'attack_discovery' as const,
        id: adUuid,
        title: 'Stolen credentials',
        workflowStatus: 'open' as const,
        alertCount: 12,
        tacticIds: [],
      },
      'LEAD-1': {
        kind: 'lead' as const,
        id: leadUuid,
        title: 'Hunt',
        priority: 1,
        status: 'active',
      },
    },
    storylines: {
      ...FIXTURE_SNAPSHOT.storylines,
      storylines: FIXTURE_SNAPSHOT.storylines.storylines.map((storyline, i) =>
        i === 1
          ? {
              ...storyline,
              response: {
                ...storyline.response,
                cases: [
                  {
                    evidenceId: 'CASE-1' as const,
                    caseId: caseUuid,
                    title: 'Marketing takeover',
                    status: 'open' as const,
                  },
                ],
              },
            }
          : storyline
      ),
    },
  };

  it.each(['names', 'ids_only'] as const)(
    'removes case, attack discovery and lead ids (%s)',
    (mode) => {
      const payload = buildBriefPayload(snapshot, mode);
      expect(payload).not.toMatch(UUID);
      [caseUuid, adUuid, leadUuid].forEach((uuid) => expect(payload).not.toContain(uuid));
      expect(payload).toContain('CASE-1');
      expect(payload).toContain('Marketing takeover');
    }
  );

  it('replaces a UUID that appears inside free text, as a last line of defence', () => {
    const payload = buildBriefPayload(
      {
        ...snapshot,
        catalog: {
          ...snapshot.catalog,
          'CASE-1': {
            kind: 'case' as const,
            caseId: caseUuid,
            title: `Case ${caseUuid} for j.chen`,
            status: 'open' as const,
          },
        },
      },
      'names'
    );
    expect(payload).not.toMatch(UUID);
    expect(payload).toContain('Case [id] for j.chen');
  });
});
