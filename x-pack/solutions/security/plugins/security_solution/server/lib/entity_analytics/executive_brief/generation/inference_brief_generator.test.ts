/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceRequestError } from '@kbn/inference-common';
import { FIXTURE_BRIEF } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import { FIXTURE_SNAPSHOT } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import { BriefJobError, toJobError } from '../job/job_errors';
import { validateBrief } from '../validation/validate_brief';
import { BRIEF_SYSTEM_PROMPT, buildBriefPayload } from './brief_prompt';
import { EXECUTIVE_BRIEF_INFERENCE_ID, InferenceBriefGenerator } from './inference_brief_generator';
import type { BriefOutputClient, BriefOutputRequest } from './inference_brief_generator';

const clientReturning = (output: object | undefined) => {
  const calls: BriefOutputRequest[] = [];
  const client: BriefOutputClient = {
    output: jest.fn(async (request: BriefOutputRequest) => {
      calls.push(request);
      return { output };
    }),
  };
  return { client, calls };
};

describe('InferenceBriefGenerator (mocked inference client)', () => {
  it('calls output() once with the fixed id, prompt, schema, retry and abort signal', async () => {
    const { client, calls } = clientReturning(FIXTURE_BRIEF);
    const controller = new AbortController();
    const generator = new InferenceBriefGenerator(client, 'my-connector');
    const result = await generator.generate({
      snapshot: FIXTURE_SNAPSHOT,
      mode: 'names',
      abortSignal: controller.signal,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      id: EXECUTIVE_BRIEF_INFERENCE_ID,
      system: BRIEF_SYSTEM_PROMPT,
      retry: { onValidationError: 1 },
      abortSignal: controller.signal,
    });
    expect(calls[0].schema.required).toEqual(['glance', 'storylines', 'blindSpots', 'decisions']);
    expect(calls[0].input).toContain(buildBriefPayload(FIXTURE_SNAPSHOT, 'names'));
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
    const client: BriefOutputClient = {
      output: jest.fn(async () => {
        throw createInferenceRequestError('no such connector', 404);
      }),
    };
    const error = await new InferenceBriefGenerator(client)
      .generate({ snapshot: FIXTURE_SNAPSHOT, mode: 'names' })
      .catch((e: Error) => e);
    expect(toJobError(error).code).toBe('connector');
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
