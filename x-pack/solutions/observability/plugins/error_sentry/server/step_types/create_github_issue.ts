/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createGithubIssueCommonDefinition } from '../../common/step_types/create_github_issue';
import type { ErrorSentryGithubConfig } from '../config';

export interface CreateGithubIssueStepDeps {
  getGithubConfig: () => ErrorSentryGithubConfig;
}

export const getCreateGithubIssueStepDefinition = ({ getGithubConfig }: CreateGithubIssueStepDeps) =>
  createServerStepDefinition({
    ...createGithubIssueCommonDefinition,
    handler: async (context) => {
      const githubConfig = getGithubConfig();
      const token = githubConfig.apiToken;
      const owner = context.input.owner ?? githubConfig.owner;
      const repo = context.input.repo ?? githubConfig.repo;

      if (!token) {
        context.logger.warn(
          'error-sentry.createGithubIssue: no GitHub API token configured (errorSentry.github.apiToken); skipping issue creation'
        );
        return { output: { created: false, skipped: true } };
      }

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: context.input.title,
          body: context.input.body,
          labels: context.input.labels,
        }),
        signal: context.abortSignal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new ExecutionError({
          type: 'GithubApiError',
          message: `GitHub API responded ${response.status}: ${text}`,
          details: { status: response.status, owner, repo },
        });
      }

      const data = (await response.json()) as { number: number; html_url: string };
      context.logger.info(
        `error-sentry.createGithubIssue: created ${owner}/${repo}#${data.number}`
      );

      return {
        output: {
          created: true,
          skipped: false,
          issueNumber: data.number,
          issueUrl: data.html_url,
        },
      };
    },
  });
