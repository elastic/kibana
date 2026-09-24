/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { materializeArticle } from '../../../services/materialize_article';
import { buildMaterializeArticleStepDefinition } from './materialize_article_step';

jest.mock('../../../services/materialize_article', () => ({
  materializeArticle: jest.fn(),
}));

const materializeArticleMock = materializeArticle as jest.Mock;
const INPUT = {
  source_type: 'rss',
  article_url: 'https://research.example/report',
  title: 'Threat report',
  rss_body_text: 'RSS summary',
};
const OUTPUT = {
  body_text: 'Rendered body',
  rendered_body_text: 'Rendered body',
  materialization: {
    provider: 'jina' as const,
    status: 'rendered' as const,
    attempted_at: '2026-09-21T18:00:00.000Z',
    source_url: INPUT.article_url,
    rendered_chars: 13,
    truncated: false,
    reason: 'rendered',
  },
};

const buildContext = (): StepHandlerContext<unknown, unknown> =>
  ({
    input: INPUT,
    abortSignal: new AbortController().signal,
  } as unknown as StepHandlerContext<unknown, unknown>);

describe('buildMaterializeArticleStepDefinition handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns materialized output', async () => {
    materializeArticleMock.mockResolvedValue(OUTPUT);
    const step = buildMaterializeArticleStepDefinition({
      logger: loggingSystemMock.createLogger(),
    });

    const result = await step.handler(buildContext());

    expect(result).toEqual({ output: OUTPUT });
    expect(materializeArticleMock).toHaveBeenCalledWith(INPUT, expect.any(AbortSignal));
  });
});
