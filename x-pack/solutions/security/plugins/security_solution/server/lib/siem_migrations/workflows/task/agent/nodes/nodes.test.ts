/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import simpleStory from '../../../../../../../common/siem_migrations/parsers/tines/mock/simple_story.json';
import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import type { OriginalWorkflow } from '../../../../../../../common/siem_migrations/workflows/types';
import { getPrepareStoryNode } from './prepare_story';
import { getMapWithMapperNode } from './map_with_mapper';
import { getFinalizeNode } from './finalize';
import type { MigrateWorkflowState } from '../types';

const originalWorkflow: OriginalWorkflow = {
  id: 'story-1',
  vendor: 'tines',
  title: simpleStory.name,
  description: simpleStory.description ?? undefined,
  data: simpleStory as OriginalWorkflow['data'],
};

const baseState = {
  id: 'item-1',
  original_workflow: originalWorkflow,
  yaml: '',
  report: undefined,
  validation: undefined,
  llm_summary: undefined,
  elastic_workflow: { title: '' },
  translation_result: MigrationTranslationResult.UNTRANSLATABLE,
  comments: [],
} as unknown as MigrateWorkflowState;

describe('workflow migration agent nodes', () => {
  const logger = loggingSystemMock.createLogger();

  it('mapWithMapper produces yaml and report from a Tines story', async () => {
    const node = getMapWithMapperNode();
    const result = await node(baseState, {} as never);

    expect(result.yaml).toContain('name: Simple story');
    expect(result.report?.mapped.length).toBeGreaterThan(0);
    expect(result.validation?.valid).toBe(true);
  });

  it('finalize sets elastic_workflow and translation_result from mapper output', async () => {
    const mapped = await getMapWithMapperNode()(baseState, {} as never);
    const stateAfterMap = { ...baseState, ...mapped, llm_summary: 'LLM summary comment' };
    const finalized = await getFinalizeNode()(stateAfterMap as MigrateWorkflowState, {} as never);

    expect(finalized.elastic_workflow?.yaml).toBeDefined();
    expect(finalized.elastic_workflow?.title).toBe(simpleStory.name);
    expect(finalized.translation_result).toBeDefined();
    expect([
      MigrationTranslationResult.FULL,
      MigrationTranslationResult.PARTIAL,
    ]).toContain(finalized.translation_result);
    expect(finalized.comments?.length).toBeGreaterThan(0);
    expect(logger).toBeDefined();
  });

  it('prepareStory passes through original workflow', async () => {
    const result = await getPrepareStoryNode()(baseState, {} as never);
    expect(result.original_workflow).toEqual(originalWorkflow);
    expect(result.id).toBe('item-1');
  });
});
