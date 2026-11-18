/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from 'http';
import type { AddressInfo } from 'net';
import type {
  Answer,
  ConfidenceDistribution,
  FakeLlmConfig,
  Truth,
  TruthRecord,
  UniformConfidence,
  Verdict,
} from './fake_llm';
import {
  DEFAULT_CONFIG,
  answerAlert,
  ruleFlips,
  parseAlertIds,
  toVerdict,
  createServer,
  simulatedToolNameOf,
  sampleConfidence,
} from './fake_llm';

const config: FakeLlmConfig = {
  ...DEFAULT_CONFIG,
  latency: { baseMs: 0, perAlertMs: 0, sigma: 0 },
};

// 20,000 alerts, 70% false positive. Every 100th alert is a planted variant of a false-positive key.
const truth = new Map<string, TruthRecord>();
const VARIANTS = [
  'new_hash',
  'untrusted_signer',
  'encoded_command_line',
  'different_script_same_shape',
];
for (let i = 0; i < 20000; i++) {
  const variant = i % 100 === 0 ? VARIANTS[(i / 100) % 4] : null;
  truth.set(`alert-${i}`, {
    verdict: variant || i % 10 >= 7 ? 'true_positive' : 'false_positive',
    variant,
  });
}
const ids = [...truth.keys()];

const truthOf = (records: Truth, id: string): TruthRecord => {
  const record = records.get(id);
  if (!record) throw new Error(`no truth record for ${id}`);
  return record;
};

// The default distributions are uniform: `{ mean, halfWidth }`.
const uniform = (distribution: ConfidenceDistribution): UniformConfidence => {
  if (distribution.quantiles !== undefined) throw new Error('expected a uniform distribution');
  return distribution;
};
const answers = (seed: number): Answer[] =>
  ids.map((id) => answerAlert({ seed, config, truth }, id));

describe('fake_llm answerAlert', () => {
  it('gives the same answer for an alert whatever the order or the batch, so that a change shows in the result', () => {
    const forward = answers(1);
    const reversed = [...ids]
      .reverse()
      .map((id) => answerAlert({ seed: 1, config, truth }, id))
      .reverse();

    expect(reversed).toEqual(forward);
  });

  it('gives other answers for another seed', () => {
    expect(answers(2)).not.toEqual(answers(1));
  });

  describe('direction of wrong verdicts', () => {
    // The share of settled alerts without a variant, of a given truth, that got the opposite verdict.
    const wrongShare = (cfg: FakeLlmConfig, verdict: Verdict) => {
      const settled = ids
        .map((id) => answerAlert({ seed: 1, config: cfg, truth }, id))
        .filter(
          (a) =>
            a.classification !== 'inconclusive' &&
            !truthOf(truth, a.id).variant &&
            truthOf(truth, a.id).verdict === verdict
        );
      return {
        count: settled.length,
        share: settled.filter((a) => a.classification !== verdict).length / settled.length,
      };
    };

    it('turns a false positive into a true positive at its own rate', () => {
      const { count, share } = wrongShare(config, 'false_positive');

      expect(count).toBeGreaterThan(10000);
      expect(share).toBeGreaterThan(config.flipRate.falsePositiveAsTruePositive - 0.01);
      expect(share).toBeLessThan(config.flipRate.falsePositiveAsTruePositive + 0.01);
    });

    it('turns a true positive into a false positive at its own rate, the case that hides an attack', () => {
      const { count, share } = wrongShare(config, 'true_positive');

      expect(count).toBeGreaterThan(4000);
      expect(share).toBeGreaterThan(config.flipRate.truePositiveAsFalsePositive - 0.015);
      expect(share).toBeLessThan(config.flipRate.truePositiveAsFalsePositive + 0.015);
    });

    it('keeps the two rates apart when they are set far apart', () => {
      const apart = {
        ...config,
        flipRate: { falsePositiveAsTruePositive: 0.2, truePositiveAsFalsePositive: 0.02 },
      };

      expect(wrongShare(apart, 'false_positive').share).toBeGreaterThan(0.18);
      expect(wrongShare(apart, 'true_positive').share).toBeLessThan(0.04);
    });
  });

  describe('confidence', () => {
    const settled = (cfg: FakeLlmConfig) =>
      ids
        .map((id) => answerAlert({ seed: 1, config: cfg, truth }, id))
        .filter((a) => a.classification !== 'inconclusive' && !truthOf(truth, a.id).variant);
    const mean = (list: Answer[]) =>
      list.reduce((sum, a) => sum + a.confidence_score, 0) / list.length;
    const split = (cfg: FakeLlmConfig) => {
      const all = settled(cfg);
      return {
        right: all.filter((a) => a.classification === a.truth),
        wrong: all.filter((a) => a.classification !== a.truth),
      };
    };

    it('gives right and wrong verdicts their own distributions, the wrong ones lower', () => {
      const { right, wrong } = split(config);

      expect(wrong.length).toBeGreaterThan(500);
      expect(mean(right)).toBeGreaterThan(uniform(config.confidence.correct).mean - 0.01);
      expect(mean(right)).toBeLessThan(uniform(config.confidence.correct).mean + 0.01);
      expect(mean(wrong)).toBeGreaterThan(uniform(config.confidence.wrong).mean - 0.015);
      expect(mean(wrong)).toBeLessThan(uniform(config.confidence.wrong).mean + 0.015);
      expect(mean(right)).toBeGreaterThan(mean(wrong));
    });

    it('follows the distribution of the wrong verdicts when only that one changes', () => {
      const lower = {
        ...config,
        confidence: { ...config.confidence, wrong: { mean: 0.58, halfWidth: 0.05 } },
      };
      const { right, wrong } = split(lower);

      expect(mean(wrong)).toBeGreaterThan(0.565);
      expect(mean(wrong)).toBeLessThan(0.595);
      expect(mean(right)).toBeGreaterThan(uniform(config.confidence.correct).mean - 0.01);
    });

    it('samples a table of quantiles, as fitted from a real run, with linear interpolation', () => {
      // Equal probability segments 0.5 to 0.9, 0.9 to 0.95, 0.95 to 1: the means of the segments are 0.7, 0.925 and 0.975.
      const fitted = {
        ...config,
        confidence: { ...config.confidence, correct: { quantiles: [0.5, 0.9, 0.95, 1] } },
      };
      const { right } = split(fitted);

      expect(sampleConfidence({ quantiles: [0.5, 0.9, 0.95, 1] }, 0)).toBe(0.5);
      expect(sampleConfidence({ quantiles: [0.5, 0.9, 0.95, 1] }, 0.5)).toBeCloseTo(0.925, 5);
      expect(Math.min(...right.map((a) => a.confidence_score))).toBeGreaterThanOrEqual(0.5);
      expect(Math.max(...right.map((a) => a.confidence_score))).toBeLessThanOrEqual(1);
      expect(mean(right)).toBeGreaterThan(0.857);
      expect(mean(right)).toBeLessThan(0.877);
    });

    it('lets far fewer wrong verdicts than right ones reach the cache threshold', () => {
      const { right, wrong } = split(config);
      const reach = (list: Answer[]) =>
        list.filter((a) => a.confidence_score >= config.confidence.cacheThreshold).length /
        list.length;

      expect(reach(right)).toBeGreaterThan(0.5);
      expect(reach(wrong)).toBeLessThan(0.15);
    });

    it('gives a missed variant without a sign the confidence of a right verdict, because the model cannot tell', () => {
      const missed = ids
        .filter((id) => truthOf(truth, id).variant === 'new_hash')
        .map((id) => answerAlert({ seed: 1, config, truth }, id))
        .filter((a) => a.classification === 'false_positive');
      const { mean: correctMean, halfWidth } = uniform(config.confidence.correct);

      expect(missed.length).toBeGreaterThan(10);
      missed.forEach((a) => {
        expect(a.confidence_score).toBeGreaterThanOrEqual(correctMean - halfWidth);
        expect(a.confidence_score).toBeLessThanOrEqual(correctMean + halfWidth);
      });
    });
  });

  it('gives inconclusive to about the inconclusive rate of the alerts', () => {
    const share = answers(1).filter((a) => a.classification === 'inconclusive').length / ids.length;

    expect(share).toBeGreaterThan(config.inconclusiveRate - 0.01);
    expect(share).toBeLessThan(config.inconclusiveRate + 0.01);
  });

  it('never finds a new_hash variant, because it shows no sign in the alert', () => {
    const found = answers(1).filter(
      (a) => truthOf(truth, a.id).variant === 'new_hash' && a.classification === 'true_positive'
    );

    expect(ids.filter((id) => truthOf(truth, id).variant === 'new_hash').length).toBeGreaterThan(0);
    expect(found).toEqual([]);
  });

  it('finds most variants that show a sign', () => {
    const signedVariants: Array<string | null | undefined> = [
      'untrusted_signer',
      'encoded_command_line',
    ];
    const signed = ids.filter((id) => signedVariants.includes(truthOf(truth, id).variant));
    const found = signed.filter(
      (id) => answerAlert({ seed: 1, config, truth }, id).classification === 'true_positive'
    );

    expect(signed.length).toBeGreaterThan(0);
    expect(found.length / signed.length).toBeGreaterThan(0.5);
  });

  it('answers inconclusive with low confidence for an alert that is not in the truth file', () => {
    expect(answerAlert({ seed: 1, config, truth }, 'unknown')).toEqual({
      id: 'unknown',
      known: false,
      classification: 'inconclusive',
      confidence_score: 0.5,
    });
  });
});

describe('fake_llm rule model (the model errs in batches, per rule and run)', () => {
  // 200 rules of 25 alerts: 10 true positives (2 of them a planted variant) and 15 false positives each.
  const ruleTruth = new Map<string, TruthRecord>();
  const RULES = Array.from({ length: 200 }, (_, r) => `rule-${r}`);
  RULES.forEach((ruleUuid, r) => {
    for (let i = 0; i < 25; i++) {
      const variant = i === 0 ? 'untrusted_signer' : null;
      ruleTruth.set(`${ruleUuid}-${i}`, {
        verdict: i < 10 ? 'true_positive' : 'false_positive',
        variant,
        kind: r % 2 ? 'aggregate' : 'process',
        ruleUuid,
      });
    }
  });
  const base = {
    ...config,
    inconclusiveRate: 0,
    flipRate: { falsePositiveAsTruePositive: 0, truePositiveAsFalsePositive: 0 },
    variantMissRate: { untrusted_signer: 0 },
  };
  const unstable = { ...base, ruleModel: { unstableRuleShare: 0.1, unstableFlipChance: 0.5 } };
  const answersOf = (cfg: FakeLlmConfig, run: number) =>
    [...ruleTruth.keys()].map((id) =>
      answerAlert({ seed: 1, run, config: cfg, truth: ruleTruth }, id)
    );
  const flippedRules = (cfg: FakeLlmConfig, run: number) =>
    new Set(
      answersOf(cfg, run)
        .filter((a) => a.ruleFlipped)
        .map((a) => truthOf(ruleTruth, a.id).ruleUuid)
    );

  it('flips nothing when the share of unstable rules is 0 (the default)', () => {
    expect(answersOf(base, 1).filter((a) => a.classification !== a.truth)).toHaveLength(0);
  });

  it('flips all true positives of a rule together, and only those that are not planted variants', () => {
    const flipped = flippedRules(unstable, 1);
    expect(flipped.size).toBeGreaterThan(0);
    answersOf(unstable, 1).forEach((a) => {
      const { ruleUuid, variant } = truthOf(ruleTruth, a.id);
      const shouldFlip = flipped.has(ruleUuid) && a.truth === 'true_positive' && !variant;
      expect(a.classification !== a.truth).toBe(shouldFlip);
    });
  });

  it('flips about unstableRuleShare x unstableFlipChance of the rules in a run, and every flip in an unstable rule', () => {
    const flipped = flippedRules(unstable, 1).size;
    // 200 rules x 0.1 x 0.5 = 10 expected; a wide band, because it is a hash and not a fit.
    expect(flipped).toBeGreaterThan(3);
    expect(flipped).toBeLessThan(20);
    const everFlipping = new Set(
      [1, 2, 3, 4, 5, 6].flatMap((run) => [...flippedRules(unstable, run)])
    );
    // Only rules of the unstable 10% can ever flip: about 20 of 200.
    expect(everFlipping.size).toBeLessThan(40);
  });

  it('gives the same flips for the same seed and run, and other ones for another run (the same rule changes between runs)', () => {
    expect(answersOf(unstable, 1)).toEqual(answersOf(unstable, 1));
    expect([...flippedRules(unstable, 1)]).not.toEqual([...flippedRules(unstable, 2)]);
  });

  it('never flips a false positive, and keeps the answer of a planted variant to the variant miss rate', () => {
    answersOf(unstable, 1)
      .filter((a) => a.truth === 'false_positive')
      .forEach((a) => expect(a.classification).toBe('false_positive'));
    const missing = { ...unstable, variantMissRate: { untrusted_signer: 1 } };
    answersOf(missing, 1)
      .filter((a) => truthOf(ruleTruth, a.id).variant)
      .forEach((a) => expect(a.classification).toBe('false_positive'));
  });

  it('ruleFlips is false for an alert without a rule', () => {
    expect(
      ruleFlips(
        { seed: 1, run: 1, config: { ruleModel: { unstableRuleShare: 1, unstableFlipChance: 1 } } },
        {}
      )
    ).toBe(false);
  });

  it('takes the confidence of the kind of the alert when there is one, and the general one otherwise', () => {
    const cfg = {
      ...base,
      confidence: { ...base.confidence, correct: { mean: 0.9, halfWidth: 0 } },
      confidenceByKind: { aggregate: { correct: { mean: 0.7, halfWidth: 0 } } },
    };
    answersOf(cfg, 1).forEach((a) => {
      const { kind } = truthOf(ruleTruth, a.id);
      expect(a.confidence_score).toBeCloseTo(kind === 'aggregate' ? 0.7 : 0.9, 5);
    });
  });
});

// What the inference plugin puts in the system message when a connector has no native tools. The examples there are
// called `my_tool...`, and the real tool is listed after them.
const SIMULATED_SYSTEM = [
  "In this environment, you have access to a set of tools you can use to answer the user's question.",
  'IMPORTANT: make sure you start and end a tool call with the <|tool_use_start|> and <|tool_use_end|> markers',
  JSON.stringify({ name: 'my_tool', description: 'A tool to call', schema: { type: 'object' } }),
  JSON.stringify({
    name: 'my_tool_without_parameters',
    description: 'A tool to call without parameters',
  }),
  JSON.stringify({
    name: 'extract_structured_response',
    description: 'x',
    schema: { type: 'object' },
  }),
].join('\n');

describe('fake_llm simulated function calling', () => {
  it('takes the tool name from the line that the plugin adds when a tool is forced', () => {
    const prompt = `${SIMULATED_SYSTEM}\nClassify.\nRemember, use the forced_tool tool to answer this question.`;

    expect(simulatedToolNameOf(prompt)).toBe('forced_tool');
  });

  it('falls back to the last listed tool and skips the examples of the instructions', () => {
    expect(simulatedToolNameOf(SIMULATED_SYSTEM)).toBe('extract_structured_response');
  });

  it('is not simulated when the prompt has no tool-use markers', () => {
    expect(
      simulatedToolNameOf(
        'Classify these alerts. Remember, use the x tool to answer this question.'
      )
    ).toBeUndefined();
  });
});

describe('fake_llm reply format', () => {
  it('does not take the format example of the prompt for an alert', () => {
    expect(
      parseAlertIds('copy the id of the <alert id="..."> block: <alert id="a">x</alert>')
    ).toEqual(['a']);
  });

  it('reads alert ids in order and once', () => {
    const prompt =
      'x <alert id="b">..</alert> y <alert id="a">..</alert> <alert id="b">again</alert>';

    expect(parseAlertIds(prompt)).toEqual(['b', 'a']);
  });

  it('keeps every verdict inside the limits of batch_reply_schema', () => {
    answers(1)
      .slice(0, 500)
      .map(toVerdict)
      .forEach((verdict) => {
        expect(['false_positive', 'true_positive', 'inconclusive']).toContain(
          verdict.classification
        );
        expect(verdict.confidence_score).toBeGreaterThanOrEqual(0);
        expect(verdict.confidence_score).toBeLessThanOrEqual(1);
        expect(verdict.rationale.length).toBeLessThanOrEqual(500);
        expect(verdict.contributing_factors.length).toBeLessThanOrEqual(3);
        verdict.contributing_factors.forEach((factor) =>
          expect(factor.length).toBeLessThanOrEqual(100)
        );
      });
  });
});

interface ChatCompletion {
  choices: Array<{
    finish_reason: string;
    message: {
      content: string | null;
      tool_calls?: Array<{ function: { name: string; arguments: string } }>;
    };
  }>;
  usage: { completion_tokens: number };
}

interface VerdictReply {
  verdicts: Array<{ id: string }>;
}

interface WrappedReply {
  verdicts?: undefined;
  response: VerdictReply;
}

type ToolCall = NonNullable<ChatCompletion['choices'][number]['message']['tool_calls']>[number];

const firstToolCall = (completion: ChatCompletion): ToolCall => {
  const [call] = completion.choices[0].message.tool_calls ?? [];
  if (!call) throw new Error('expected a tool call');
  return call;
};

interface TypedResponse {
  json(): Promise<ChatCompletion>;
  text(): Promise<string>;
}

describe('fake_llm server', () => {
  let server: Server;
  let url: string;
  const request = {
    model: 'x',
    messages: [
      {
        role: 'user',
        content: 'Classify.\n<alert id="alert-1">a</alert>\n<alert id="alert-2">b</alert>',
      },
    ],
    tools: [
      { type: 'function', function: { name: 'structuredOutput', parameters: { type: 'object' } } },
    ],
    tool_choice: { type: 'function', function: { name: 'structuredOutput' } },
  };
  const post = (body: object): Promise<TypedResponse> =>
    fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    server = createServer({ seed: 1, config, truth });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('calls the forced tool with one verdict per alert, in prompt order', async () => {
    const body = await (await post(request)).json();
    const call = firstToolCall(body);

    expect(body.choices[0].finish_reason).toBe('tool_calls');
    expect(call.function.name).toBe('structuredOutput');
    expect(
      (JSON.parse(call.function.arguments) as VerdictReply).verdicts.map(({ id }) => id)
    ).toEqual(['alert-1', 'alert-2']);
  });

  it('gives the same verdicts when the reply is streamed', async () => {
    const plain = await (await post(request)).json();
    const text = await (await post({ ...request, stream: true })).text();
    const events = text
      .split('\n\n')
      .filter(Boolean)
      .map((event) => event.replace(/^data: /, ''));
    const args = events
      .filter((event) => event !== '[DONE]')
      .map(
        (event) => JSON.parse(event).choices[0]?.delta?.tool_calls?.[0]?.function?.arguments ?? ''
      )
      .join('');

    expect(events[events.length - 1]).toBe('[DONE]');
    expect(JSON.parse(args)).toEqual(JSON.parse(firstToolCall(plain).function.arguments));
  });

  it('answers a prompt with simulated function calling with the block that the inference plugin parses', async () => {
    const simulated = {
      model: 'x',
      temperature: 0,
      messages: [
        { role: 'system', content: SIMULATED_SYSTEM },
        {
          role: 'user',
          content:
            'Classify.\n<alert id="alert-1">a</alert>\n<alert id="alert-2">b</alert>\nRemember, use the extract_structured_response tool to answer this question.',
        },
      ],
    };
    const body = await (await post(simulated)).json();
    const { content } = body.choices[0].message;
    // The regex of `parseInlineFunctionCalls` in the inference plugin.
    const match = (content ?? '').match(
      /<\|tool_use_start\|>\s*```json\n?(.*?)(\n?```\s*).*<\|tool_use_end\|>/s
    );

    expect(match).not.toBeNull();
    const call = JSON.parse(match?.[1] ?? '') as { name: string; input: WrappedReply };
    expect(call.name).toBe('extract_structured_response');
    expect(call.input.response.verdicts.map(({ id }) => id)).toEqual(['alert-1', 'alert-2']);
  });

  it('wraps the verdicts in a response property when the tool parameters have one', async () => {
    const wrapped = {
      ...request,
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_structured_response',
            parameters: { type: 'object', properties: { response: { type: 'object' } } },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'extract_structured_response' } },
    };
    const body = await (await post(wrapped)).json();
    const args = JSON.parse(firstToolCall(body).function.arguments) as WrappedReply;

    expect(args.response.verdicts.map(({ id }) => id)).toEqual(['alert-1', 'alert-2']);
  });

  it('reports the completion tokens per alert when that setting is set', async () => {
    const perAlert = createServer({
      seed: 1,
      config: { ...config, tokens: { charsPerToken: 4, completionPerAlert: 100 } },
      truth,
    });
    await new Promise<void>((resolve) => perAlert.listen(0, '127.0.0.1', resolve));
    const response = await fetch(
      `http://127.0.0.1:${(perAlert.address() as AddressInfo).port}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
    const { usage } = await response.json();
    await new Promise<void>((resolve) => perAlert.close(() => resolve()));

    // two alerts in the prompt
    expect(usage.completion_tokens).toBe(200);
  });

  it('answers with the verdicts as JSON text when the request offers no tool, as the Alert Triage worker sends it', async () => {
    // The connector of the worker sends only model, temperature and stream, with the schema inside the prompt.
    const { tools, tool_choice: toolChoice, ...withoutTools } = request;
    const body = await (await post({ ...withoutTools, temperature: 0 })).json();
    const message = body.choices[0].message;

    expect(toolChoice).toBeDefined();
    expect(tools).toBeDefined();
    expect(body.choices[0].finish_reason).toBe('stop');
    expect(message.tool_calls).toBeUndefined();
    // The step wraps its schema in `response` and reads `parsed.response`: a reply without it fails the step.
    const parsed = JSON.parse(message.content ?? '') as WrappedReply;
    expect(parsed.verdicts).toBeUndefined();
    expect(parsed.response.verdicts.map(({ id }) => id)).toEqual(['alert-1', 'alert-2']);
  });

  it('answers in text, not with a tool call, when the prompt has no alerts', async () => {
    const body = await (
      await post({ ...request, messages: [{ role: 'user', content: 'hello' }] })
    ).json();

    expect(body.choices[0].finish_reason).toBe('stop');
    expect(body.choices[0].message.tool_calls).toBeUndefined();
  });
});
