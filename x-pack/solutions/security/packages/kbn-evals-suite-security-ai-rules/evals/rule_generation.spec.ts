/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '@kbn/evals';
import { tags } from '@kbn/scout';
import { createRestClient } from '@kbn/inference-plugin/common';
import { sampleRules } from '../datasets/sample_rules';
import { createRuleEvaluators } from '../src/evaluators';
import type { RuleGenerationTaskOutput } from '../src/evaluators';
import { extractCategory } from '../src/helpers';

evaluate.describe(
  'AI Rule Generation',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('generates accurate detection rules', async ({
      executorClient,
      fetch,
      log,
    }) => {
      // Get the connector ID from environment variable (preconfigured connector)
      const connectorId = process.env.EVALUATION_CONNECTOR_ID || 'gpt-4o';
      
      // Create inference client manually bound to the preconfigured connector
      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId,
        },
      });
      
      const dataset = {
        name: 'security-ai-rules: rule-generation-basic',
        description:
          'Evaluates AI-generated detection rules against known examples from elastic/detection-rules',
        examples: sampleRules.map((rule) => ({
          input: {
            prompt: `Generate a detection rule that ${rule.description.toLowerCase()}`,
          },
          output: {
            expected: rule,
          },
          metadata: {
            category: rule.category,
            difficulty: 'medium',
            expectedName: rule.name,
          },
        })),
      };

      log.info(`Running AI rule generation evaluation with ${dataset.examples.length} examples`);
      log.info(`Using connector: ${connectorId}`);

      await executorClient.runExperiment<
        { prompt: string },
        typeof dataset.examples[0].output.expected,
        RuleGenerationTaskOutput
      >(
        {
          dataset,
          task: async ({ input }) => {
            try {
              log.debug(`Generating rule for prompt: ${input.prompt.substring(0, 100)}...`);

              // Call the AI rule creation API
              const response = await fetch(
                '/internal/security_solution/detection_engine/ai_rule_creation',
                {
                  method: 'POST',
                  version: '2023-10-31',
                  body: JSON.stringify({
                    userQuery: input.prompt,
                    connectorId,
                  }),
                }
              );

              if (!response || !response.rule) {
                log.warning('API returned no rule');
                return {
                  error: 'No rule returned from API',
                };
              }

              const generatedRule = {
                name: response.rule.name,
                description: response.rule.description,
                query: response.rule.query,
                threat: response.rule.threat || [],
                severity: response.rule.severity,
                tags: response.rule.tags || [],
                riskScore: response.rule.risk_score || response.rule.riskScore,
                from: response.rule.from,
                category: extractCategory(response.rule.name || ''),
              };

              log.debug(`Generated rule: ${generatedRule.name}`);
              log.debug(`Generated query preview: ${generatedRule.query?.substring(0, 150)}...`);

              return {
                generatedRule,
              };
            } catch (error) {
              log.error(`Error generating rule: ${error instanceof Error ? error.message : String(error)}`);
              return {
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
        },
        createRuleEvaluators({ inferenceClient })
      );

      log.info('Evaluation complete');
    });

    evaluate('handles edge cases and errors gracefully', async ({
      executorClient,
      fetch,
      log,
    }) => {
      // Get the connector ID from environment variable (preconfigured connector)
      const connectorId = process.env.EVALUATION_CONNECTOR_ID || 'gpt-4o';
      
      // Create inference client manually bound to the preconfigured connector
      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId,
        },
      });
      
      const edgeCaseDataset = {
        name: 'security-ai-rules: edge-cases',
        description: 'Tests AI rule generation with edge cases and challenging prompts',
        examples: [
          {
            input: {
              prompt: 'Detect suspicious activity',
            },
            output: {
              expected: {
                name: 'Generic Suspicious Activity',
                description: 'Detects suspicious activity',
                query: 'process where true',
                threat: [],
                severity: 'low',
                tags: [],
                riskScore: 21,
                from: 'now-5m',
                category: 'unknown',
              },
            },
            metadata: {
              testType: 'vague-prompt',
              difficulty: 'hard',
            },
          },
          {
            input: {
              prompt:
                'Create a rule for detecting advanced persistent threat actors using zero-day exploits with polymorphic malware and anti-forensics techniques',
            },
            output: {
              expected: {
                name: 'Complex APT Detection',
                description: 'Detects advanced persistent threats',
                query: 'process where true',
                threat: [],
                severity: 'critical',
                tags: [],
                riskScore: 99,
                from: 'now-5m',
                category: 'execution',
              },
            },
            metadata: {
              testType: 'complex-prompt',
              difficulty: 'very-hard',
            },
          },
        ],
      };

      log.info('Running edge case evaluation');

      await executorClient.runExperiment<
        { prompt: string },
        typeof edgeCaseDataset.examples[0].output.expected,
        RuleGenerationTaskOutput
      >(
        {
          dataset: edgeCaseDataset,
          task: async ({ input }) => {
            try {
              const response = await fetch(
                '/internal/security_solution/detection_engine/ai_rule_creation',
                {
                  method: 'POST',
                  version: '2023-10-31',
                  body: JSON.stringify({
                    userQuery: input.prompt,
                    connectorId,
                  }),
                }
              );

              if (!response || !response.rule) {
                return {
                  error: 'No rule returned from API',
                };
              }

              return {
                generatedRule: {
                  name: response.rule.name,
                  description: response.rule.description,
                  query: response.rule.query,
                  threat: response.rule.threat || [],
                  severity: response.rule.severity,
                  tags: response.rule.tags || [],
                  riskScore: response.rule.risk_score || response.rule.riskScore,
                  from: response.rule.from,
                  category: extractCategory(response.rule.name || ''),
                },
              };
            } catch (error) {
              log.error(`Error in edge case: ${error instanceof Error ? error.message : String(error)}`);
              return {
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
        },
        createRuleEvaluators({ inferenceClient })
      );

      log.info('Edge case evaluation complete');
    });
  }
);
