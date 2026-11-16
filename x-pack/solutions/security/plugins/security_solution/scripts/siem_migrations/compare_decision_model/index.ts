/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEsClient, createKbnClient } from '../../endpoint/common/stack_services';
import type { RuleMigrationRule } from '../../../common/siem_migrations/model/rule_migration.gen';
import { judge, type JudgeVerdict } from './judge';
import {
  chatCompleteJson,
  decideChoice,
  resolveDecisionInferenceId,
  type DecisionModelAnswer,
} from './models';
import {
  buildIntegrationCase,
  buildPrebuiltRuleCase,
  getNlQuery,
  NO_MATCH,
  renderSemanticQueryPrompt,
  type DecisionCase,
  type NodeName,
} from './prompts';
import { getSpaceRules, searchIntegrations, searchPrebuiltRules } from './rag';

interface CaseResult {
  rule: { id: string; title: string; vendor: string };
  node: NodeName;
  /**
   * QRadar and Sentinel: `from_comment` when the graph's natural language interpretation is used,
   * `none` when the rule has none (unsupported functions, or not processed yet).
   */
  nl_query: 'not_needed' | 'from_comment' | 'none';
  semantic_query: string;
  candidates: string[];
  /** `skipped_prebuilt_match`: Opus (the reference) matched a prebuilt rule, so the graph ends there. */
  status: 'compared' | 'skipped_no_candidates' | 'skipped_prebuilt_match' | 'error';
  opus?: { choice: string; summary?: string; latency_ms: number };
  decision_model?: Omit<DecisionModelAnswer, 'latencyMs'> & { latency_ms: number };
  exact_match?: boolean;
  judge?: JudgeVerdict;
  error?: string;
}

interface Options {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  opusConnectorId: string;
  judgeConnectorId: string;
  decisionInferenceId: string;
}

const compareCase = async (
  { esClient, kbnClient, opusConnectorId, judgeConnectorId, decisionInferenceId }: Options,
  decisionCase: DecisionCase
): Promise<Pick<CaseResult, 'opus' | 'decision_model' | 'exact_match' | 'judge'>> => {
  const [opus, decisionModel] = await Promise.all([
    chatCompleteJson<Record<string, unknown>>(kbnClient, opusConnectorId, decisionCase.messages),
    decideChoice(esClient, decisionInferenceId, {
      ...decisionCase.decision,
      choices: decisionCase.choices,
    }),
  ]);

  // The graph keeps the LLM's pick only when it equals a candidate key; anything else is no match.
  const opusPick = opus.answer[decisionCase.answerKey];
  const opusChoice =
    typeof opusPick === 'string' && opusPick !== NO_MATCH && opusPick in decisionCase.choices
      ? opusPick
      : NO_MATCH;
  const summary = typeof opus.answer.summary === 'string' ? opus.answer.summary : undefined;

  const verdict = await judge(kbnClient, judgeConnectorId, {
    decisionCase,
    reference: { choice: opusChoice, summary },
    candidate: {
      choice: decisionModel.choice,
      confidence: decisionModel.confidence,
      probabilities: decisionModel.probabilities,
    },
  });

  const { latencyMs, ...decisionModelRest } = decisionModel;
  return {
    opus: { choice: opusChoice, summary, latency_ms: opus.latencyMs },
    decision_model: { ...decisionModelRest, latency_ms: latencyMs },
    exact_match: opusChoice === decisionModel.choice,
    judge: { same: verdict.same, reasoning: verdict.reasoning },
  };
};

const compareRule = async (options: Options, rule: RuleMigrationRule): Promise<CaseResult[]> => {
  const { esClient, kbnClient, opusConnectorId } = options;
  const original = rule.original_rule;
  const nlQuery = getNlQuery(rule);
  const base = {
    rule: { id: rule.id, title: original.title, vendor: original.vendor },
    nl_query:
      original.vendor === 'splunk'
        ? ('not_needed' as const)
        : nlQuery
        ? ('from_comment' as const)
        : ('none' as const),
  };

  const { answer } = await chatCompleteJson<{ semantic_query?: string }>(
    kbnClient,
    opusConnectorId,
    await renderSemanticQueryPrompt(original, nlQuery)
  );
  const semanticQuery = answer.semantic_query ?? '';
  const techniqueIds = (original.annotations?.mitre_attack ?? []).join(',');

  const runNode = async (
    node: NodeName,
    candidates: string[],
    build: () => Promise<DecisionCase>
  ): Promise<CaseResult> => {
    const result = { ...base, node, semantic_query: semanticQuery, candidates };
    // The graph nodes return "no match" without calling the LLM when the RAG finds nothing.
    if (candidates.length === 0) {
      return { ...result, status: 'skipped_no_candidates' };
    }
    try {
      return { ...result, status: 'compared', ...(await compareCase(options, await build())) };
    } catch (error) {
      return { ...result, status: 'error', error: String(error?.message ?? error) };
    }
  };

  const prebuiltRules = await searchPrebuiltRules(esClient, semanticQuery, techniqueIds);
  const prebuiltResult = await runNode(
    'matchPrebuiltRule',
    prebuiltRules.map(({ name }) => name),
    () => buildPrebuiltRuleCase(original, nlQuery, prebuiltRules)
  );

  if (prebuiltResult.opus && prebuiltResult.opus.choice !== NO_MATCH) {
    return [
      prebuiltResult,
      {
        ...base,
        node: 'retrieveIntegrations',
        semantic_query: semanticQuery,
        candidates: [],
        status: 'skipped_prebuilt_match',
      },
    ];
  }

  const integrations = await searchIntegrations(esClient, semanticQuery);
  const integrationResult = await runNode(
    'retrieveIntegrations',
    integrations.map(({ id }) => id),
    () => buildIntegrationCase(original, nlQuery, integrations)
  );
  return [prebuiltResult, integrationResult];
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
};

const percent = (part: number, total: number) =>
  total ? `${((100 * part) / total).toFixed(1)}%` : 'n/a';

const summarize = (results: CaseResult[]) =>
  (['matchPrebuiltRule', 'retrieveIntegrations'] as const).map((node) => {
    const ofNode = results.filter((result) => result.node === node);
    const compared = ofNode.filter((result) => result.status === 'compared');
    const same = compared.filter((result) => result.judge?.same);
    const different = compared.filter((result) => !result.judge?.same);
    const confidence = (cases: CaseResult[]) =>
      cases.length
        ? (
            cases.reduce((sum, result) => sum + (result.decision_model?.confidence ?? 0), 0) /
            cases.length
          ).toFixed(2)
        : 'n/a';
    return {
      node,
      cases: ofNode.length,
      compared: compared.length,
      skipped_no_candidates: ofNode.filter((r) => r.status === 'skipped_no_candidates').length,
      skipped_prebuilt_match: ofNode.filter((r) => r.status === 'skipped_prebuilt_match').length,
      errors: ofNode.filter((result) => result.status === 'error').length,
      judge_same: percent(same.length, compared.length),
      exact_match: percent(compared.filter((result) => result.exact_match).length, compared.length),
      jev_confidence_when_same: confidence(same),
      jev_confidence_when_different: confidence(different),
      p50_latency_ms_opus: median(compared.map((result) => result.opus?.latency_ms ?? NaN)),
      p50_latency_ms_jev: median(
        compared.map((result) => result.decision_model?.latency_ms ?? NaN)
      ),
    };
  });

export const cli = () => {
  run(
    async ({ flags, log }) => {
      const opusConnectorId = flags.opusConnectorId as string;
      if (!opusConnectorId) {
        throw new Error('--opusConnectorId is required');
      }
      const credentials = {
        log,
        username: flags.username as string,
        password: flags.password as string,
        apiKey: (flags.apiKey as string) || undefined,
      };
      const esClient = createEsClient({ ...credentials, url: flags.elasticsearchUrl as string });
      const options: Options = {
        esClient,
        kbnClient: createKbnClient({ ...credentials, url: flags.kibanaUrl as string }),
        log,
        opusConnectorId,
        judgeConnectorId: (flags.judgeConnectorId as string) || opusConnectorId,
        decisionInferenceId:
          (flags.decisionInferenceId as string) || (await resolveDecisionInferenceId(esClient)),
      };
      const outFile = path.resolve(
        (flags.out as string) ||
          `target/siem_migrations/decision_model_compare_${new Date().toISOString()}.jsonl`
      );
      await fs.mkdir(path.dirname(outFile), { recursive: true });

      const rules = await getSpaceRules(esClient, {
        spaceId: flags.space as string,
        limit: Number(flags.limit),
      });
      log.info(
        `Comparing ${rules.length} rules: Opus [${opusConnectorId}] vs decision model [${options.decisionInferenceId}], judge [${options.judgeConnectorId}]`
      );

      const results: CaseResult[] = [];
      for (const [index, rule] of rules.entries()) {
        try {
          const ruleResults = await compareRule(options, rule);
          results.push(...ruleResults);
          await fs.appendFile(outFile, ruleResults.map((r) => `${JSON.stringify(r)}\n`).join(''));
          log.info(
            `[${index + 1}/${rules.length}] ${rule.original_rule.title}: ${ruleResults
              .map(
                (r) => `${r.node}=${r.status === 'compared' ? `same:${r.judge?.same}` : r.status}`
              )
              .join(', ')}`
          );
        } catch (error) {
          log.error(`[${index + 1}/${rules.length}] ${rule.original_rule.title}: ${error.message}`);
        }
      }

      // eslint-disable-next-line no-console
      console.table(summarize(results));
      log.info(`Results written to ${outFile}`);
    },
    {
      description:
        'Compares Opus with the decision model on the rule migration graph decisions over the RAG candidates of every migration rule in a space',
      flags: {
        string: [
          'kibanaUrl',
          'elasticsearchUrl',
          'username',
          'password',
          'apiKey',
          'space',
          'opusConnectorId',
          'judgeConnectorId',
          'decisionInferenceId',
          'limit',
          'out',
        ],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          space: 'default',
          limit: '10000',
        },
        help: `
        --space                Space whose migration rules are compared (Default: default)
        --opusConnectorId      (required) Kibana connector of the reference LLM, called through the inference service
        --judgeConnectorId     Kibana connector of the judge (Default: opusConnectorId)
        --decisionInferenceId  decision inference endpoint (Default: first listed by GET _inference/decision/_all)
        --limit                Maximum rules to compare (Default: 10000, the max search window)
        --out                  JSONL output file (Default: target/siem_migrations/decision_model_compare_<time>.jsonl)
        --kibanaUrl            (Default: http://127.0.0.1:5601)
        --elasticsearchUrl     (Default: http://127.0.0.1:9200)
        --username/--password  (Default: elastic/changeme)
        --apiKey               Used instead of username/password when set
      `,
      },
    }
  );
};
