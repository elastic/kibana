/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ANALYSIS_FIELDS } from '@kbn/workflows/managed';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  TRIAGE_STRICT_KEY_TAG_PREFIX,
  TRIAGE_WIDE_KEY_TAG_PREFIX,
} from '../../alert_triage/constants';
import {
  JEV_LANE_TAG_PREFIX,
  JEV_VERDICT_TAG,
  type JevFirstLineMode,
} from '../../alert_triage/jev_first_line';
import { hashKey } from '../../alert_triage/key_tags';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import { TRIAGE_WOULD_REUSE_TAG_PREFIX } from '../../alert_triage/verdict_cache';
import type { JevDecide } from './jev_client';
import { getTriageJevFirstLineStepDefinition } from './jev_first_line_step';

type Source = Record<string, unknown>;

const registryAlert = (marker: string, rule = 'rule-1', minute = 1): Source => ({
  '@timestamp': `2026-11-18T10:${String(minute).padStart(2, '0')}:00.000Z`,
  'kibana.alert.rule.uuid': rule,
  'kibana.alert.rule.name': `Name of ${rule}`,
  'kibana.alert.rule.revision': 1,
  'kibana.alert.severity': 'low',
  'event.category': ['registry'],
  'registry.path': `HKLM\\Software\\${marker}`,
  'process.executable': `C:\\Tools\\${marker}.exe`,
  'host.os.type': 'windows',
});

const processAlert = (marker: string): Source => ({
  '@timestamp': '2026-11-18T10:00:00.000Z',
  'kibana.alert.rule.uuid': 'rule-p',
  'kibana.alert.rule.revision': 1,
  'kibana.alert.severity': 'low',
  'host.os.type': 'windows',
  'process.executable': `C:\\Tools\\${marker}.exe`,
  'process.code_signature.subject_name': 'Acme',
});

const aggregationAlert = (): Source => ({
  '@timestamp': '2026-11-18T10:00:00.000Z',
  'kibana.alert.rule.uuid': 'rule-agg',
  'kibana.alert.severity': 'low',
  'event.category': ['network'],
});

const answer = (attack: number, confidence: number) => ({
  type: 'choice',
  probabilities: [
    { value: 'true_positive', probability: attack },
    { value: 'false_positive', probability: 1 - attack },
  ],
  confidence,
});

/** What the fake model says about an alert, by a word in its text. */
const SCORES: Record<string, ReturnType<typeof answer> | undefined> = {
  BENIGN: answer(0.01, 0.98),
  ATTACK: answer(0.99, 0.98),
  MIDDLE: answer(0.5, 0.0),
};

/** A fake decision model: it reads the numbered alerts of the text and answers each question by the word in its alert. */
const fakeDecide = (): jest.Mock<ReturnType<JevDecide>, Parameters<JevDecide>> =>
  jest.fn(async (input, questions) => {
    const blocks = input.split(/\n\n(?=Alert \d+:)/).filter((block) => block.startsWith('Alert '));
    return Object.fromEntries(
      Object.keys(questions).flatMap((name, index) => {
        const word = Object.keys(SCORES).find((candidate) =>
          (blocks[index] ?? '').includes(candidate)
        );
        const score = word === undefined ? undefined : SCORES[word];
        return score === undefined ? [] : [[name, score]];
      })
    );
  });

const setup = ({
  alerts,
  mode = 'on',
  enabled = true,
  decide = fakeDecide(),
  getDecideThrows = false,
  tagFailsFor,
}: {
  alerts: Array<[string, Source]>;
  mode?: JevFirstLineMode;
  enabled?: boolean;
  decide?: jest.Mock<ReturnType<JevDecide>, Parameters<JevDecide>>;
  getDecideThrows?: boolean;
  /** A tag call whose first tag is this one fails. */
  tagFailsFor?: string;
}) => {
  const callKibanaApi = jest.fn(
    async ({ path, body }: { path: string; body?: Record<string, any> }) => {
      if (path.endsWith('/signals/search')) {
        return { body: { hits: { hits: alerts.map(([_id, _source]) => ({ _id, _source })) } } };
      }
      if (path.endsWith('/signals/tags')) {
        if (tagFailsFor && body?.tags.tags_to_add[0] === tagFailsFor)
          throw new Error('tagging failed');
        return { body: { updated: body?.ids.length ?? 0, timed_out: false, failures: [] } };
      }
      return { body: {} };
    }
  );
  const pause = jest.fn(async (_ms: number) => undefined);
  const warn = jest.fn();
  const run = () =>
    getTriageJevFirstLineStepDefinition({
      isContextEngineEnabled: async () => enabled,
      getMode: async () => mode,
      getDecide: () => {
        if (getDecideThrows) throw new Error('no client');
        return decide;
      },
      pause,
    }).handler({
      input: {
        space_id: 'default',
        analysis_tag_prefix: 'alert_analysis:',
        lookback_hours: 24,
        min_severity: 'low',
        exclude_building_blocks: false,
        excluded_rule_tags: [],
      },
      contextManager: { callKibanaApi, getFakeRequest: () => ({}) },
      logger: { warn },
    } as unknown as StepHandlerContext<unknown, unknown>);
  const tagCalls = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/tags'))
      .map(([{ body }]) => body as { ids: string[]; tags: { tags_to_add: string[] } })
      .map(({ ids, tags }) => ({ ids, add: tags.tags_to_add }));
  return { run, decide, callKibanaApi, tagCalls, pause, warn };
};

describe('triage Jev first line step', () => {
  describe('the flag and the Context Engine', () => {
    it('does nothing with the flag off: no alert is read, no call is made, no tag is written', async () => {
      const { run, callKibanaApi, decide } = setup({
        mode: 'off',
        alerts: [['a-1', registryAlert('BENIGN-1')]],
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'off', scored: 0, calls: 0 });
      expect(callKibanaApi).not.toHaveBeenCalled();
      expect(decide).not.toHaveBeenCalled();
    });

    it('reports `disabled` and scores nothing when the Context Engine is off', async () => {
      const { run, decide } = setup({
        enabled: false,
        alerts: [['a-1', registryAlert('BENIGN-1')]],
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'disabled' });
      expect(decide).not.toHaveBeenCalled();
    });
  });

  describe('which alerts are scored', () => {
    it('scores the alerts of a registry key and leaves out a process alert and an alert without a key', async () => {
      const { run, decide } = setup({
        alerts: [
          ['r-1', registryAlert('BENIGN-1')],
          ['p-1', processAlert('PROCESSMARK')],
          ['g-1', aggregationAlert()],
        ],
      });

      const { output } = await run();

      expect(output).toMatchObject({ candidates: 3, eligible: 1, scored: 1, calls: 1 });
      const [text] = decide.mock.calls[0];
      expect(text).toContain('BENIGN-1');
      expect(text).not.toContain('PROCESSMARK');
    });

    it('asks for the fields that Alert Analysis shows, and leaves out the alerts that carry a lane tag or a would-reuse tag', async () => {
      const { run, callKibanaApi } = setup({ alerts: [] });

      await run();

      const search = callKibanaApi.mock.calls.find(([{ path }]) =>
        path.endsWith('/signals/search')
      );
      expect(search?.[0].body?._source).toEqual(
        expect.arrayContaining(
          ALERT_ANALYSIS_FIELDS.filter((field) => field !== 'kibana.alert.workflow_tags')
        )
      );
      const mustNot = search?.[0].body?.query.bool.must_not;
      expect(mustNot).toContainEqual({
        prefix: { 'kibana.alert.workflow_tags': JEV_LANE_TAG_PREFIX },
      });
      expect(mustNot).toContainEqual({
        prefix: { 'kibana.alert.workflow_tags': TRIAGE_WOULD_REUSE_TAG_PREFIX },
      });
    });

    it('sends one call for each rule, with one question for each alert of its batch', async () => {
      const { run, decide } = setup({
        alerts: [
          ['a-1', registryAlert('BENIGN-1', 'rule-a')],
          ['a-2', registryAlert('BENIGN-2', 'rule-a', 2)],
          ['b-1', registryAlert('ATTACK-1', 'rule-b')],
        ],
      });

      const { output } = await run();

      expect(output).toMatchObject({ eligible: 3, calls: 2, scored: 3 });
      const questionCounts = decide.mock.calls.map(
        ([, questions]) => Object.keys(questions).length
      );
      expect(questionCounts.sort()).toEqual([1, 2]);
      expect(decide.mock.calls.map(([text]) => text.split('\n')[0]).sort()).toEqual([
        'Rule: Name of rule-a',
        'Rule: Name of rule-b',
      ]);
    });
  });

  describe('shadow mode', () => {
    it('tags the lane of each scored alert and gives no verdict, so that every alert is still analyzed', async () => {
      const { run, tagCalls } = setup({
        mode: 'shadow',
        alerts: [
          ['b', registryAlert('BENIGN-1')],
          ['x', registryAlert('ATTACK-1', 'rule-1', 2)],
          ['m', registryAlert('MIDDLE-1', 'rule-1', 3)],
        ],
      });

      const { output } = await run();

      expect(output).toMatchObject({
        status: 'ok',
        scored: 3,
        lane_benign: 1,
        lane_attack: 1,
        lane_middle: 1,
        applied: 0,
      });
      expect(tagCalls()).toEqual([
        { ids: ['b'], add: [`${JEV_LANE_TAG_PREFIX}benign`] },
        { ids: ['x'], add: [`${JEV_LANE_TAG_PREFIX}attack`] },
        { ids: ['m'], add: [`${JEV_LANE_TAG_PREFIX}middle`] },
      ]);
    });
  });

  describe('on mode', () => {
    it('gives an alert of the benign lane a false positive verdict, the Jev tag and its key tags, so that the planner skips it', async () => {
      const doc = registryAlert('BENIGN-1');
      const { strict, wide } = buildPatternKeys(doc);
      const { run, tagCalls } = setup({ alerts: [['b', doc]] });

      const { output } = await run();

      expect(output).toMatchObject({ scored: 1, lane_benign: 1, applied: 1 });
      expect(tagCalls()).toEqual([
        { ids: ['b'], add: ['az:false_positive', JEV_VERDICT_TAG, `${JEV_LANE_TAG_PREFIX}benign`] },
        {
          ids: ['b'],
          add: [
            `${TRIAGE_STRICT_KEY_TAG_PREFIX}${hashKey('default', strict as string)}`,
            `${TRIAGE_WIDE_KEY_TAG_PREFIX}${hashKey('default', wide)}`,
          ],
        },
      ]);
    });

    it('gives an alert of the attack or middle lane only its lane tag, so that it is analyzed', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          ['x', registryAlert('ATTACK-1')],
          ['m', registryAlert('MIDDLE-1', 'rule-1', 2)],
        ],
      });

      const { output } = await run();

      expect(output).toMatchObject({ lane_attack: 1, lane_middle: 1, applied: 0 });
      expect(tagCalls().flatMap(({ add }) => add)).toEqual([
        `${JEV_LANE_TAG_PREFIX}attack`,
        `${JEV_LANE_TAG_PREFIX}middle`,
      ]);
    });

    it('writes the key tags once for each key, not once for each alert', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          ['b1', registryAlert('BENIGN-1')],
          ['b2', registryAlert('BENIGN-2', 'rule-1', 2)],
        ],
      });

      await run();

      const keyCalls = tagCalls().filter(({ add }) =>
        add[0].startsWith(TRIAGE_STRICT_KEY_TAG_PREFIX)
      );
      expect(keyCalls.map(({ ids }) => ids)).toEqual([['b1'], ['b2']]);
    });
  });

  describe('failures', () => {
    it('leaves the alerts of a call that fails three times untagged, so that they are analyzed, and waits longer between the tries', async () => {
      const decide = fakeDecide();
      decide.mockRejectedValue(new Error('the model answered 429'));
      const { run, tagCalls, pause, warn } = setup({
        decide,
        alerts: [['b', registryAlert('BENIGN-1')]],
      });

      const { output } = await run();

      expect(output).toMatchObject({
        status: 'ok',
        calls: 1,
        failed_calls: 1,
        scored: 0,
        applied: 0,
      });
      expect(decide).toHaveBeenCalledTimes(3);
      expect(pause.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
      expect(tagCalls()).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('429'));
    });

    it('uses the answer of a call that fails once and then works', async () => {
      const real = fakeDecide();
      let calls = 0;
      const decide = jest.fn(async (...args: Parameters<JevDecide>) => {
        calls++;
        if (calls === 1) throw new Error('the model answered 503');
        return real(...args);
      });
      const { run } = setup({ decide, alerts: [['b', registryAlert('BENIGN-1')]] });

      const { output } = await run();

      expect(output).toMatchObject({ failed_calls: 0, scored: 1, applied: 1 });
    });

    it('leaves an alert that the model did not answer untagged', async () => {
      const { run, tagCalls } = setup({
        alerts: [
          ['b', registryAlert('BENIGN-1')],
          ['n', registryAlert('NOANSWER-1', 'rule-1', 2)],
        ],
      });

      const { output } = await run();

      expect(output).toMatchObject({ eligible: 2, scored: 1 });
      expect(tagCalls().flatMap(({ ids }) => ids)).not.toContain('n');
    });

    it('applies no verdict when the lane tag cannot be written, and counts the failure', async () => {
      const { run, tagCalls } = setup({
        alerts: [['b', registryAlert('BENIGN-1')]],
        tagFailsFor: 'az:false_positive',
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'ok', scored: 0, applied: 0, tag_failures: 1 });
      expect(tagCalls().some(({ add }) => add[0].startsWith(TRIAGE_STRICT_KEY_TAG_PREFIX))).toBe(
        false
      );
    });

    it('reports `failed` and tags nothing when the client cannot be made', async () => {
      const { run, tagCalls } = setup({
        getDecideThrows: true,
        alerts: [['b', registryAlert('BENIGN-1')]],
      });

      const { output } = await run();

      expect(output).toMatchObject({ status: 'failed', scored: 0 });
      expect(tagCalls()).toEqual([]);
    });
  });
});
