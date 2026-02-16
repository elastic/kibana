/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { createSLO } from './fixtures/slo';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';

describe('SLO metadata support', () => {
  describe('SLI pipeline template', () => {
    it('includes slo.metadata in the pipeline processors', () => {
      const slo = createSLO({
        metadata: { team: 'platform', cost_center: 'engineering' },
      });

      const pipeline = getSLIPipelineTemplate(slo, 'default');
      const metadataProcessor = pipeline.processors?.find(
        (p) => 'set' in p && (p.set as { field: string }).field === 'slo.metadata'
      );

      expect(metadataProcessor).toBeDefined();
      expect((metadataProcessor as { set: { value: unknown } }).set.value).toEqual({
        team: 'platform',
        cost_center: 'engineering',
      });
    });

    it('sets empty metadata when not provided', () => {
      const slo = createSLO();

      const pipeline = getSLIPipelineTemplate(slo, 'default');
      const metadataProcessor = pipeline.processors?.find(
        (p) => 'set' in p && (p.set as { field: string }).field === 'slo.metadata'
      );

      expect(metadataProcessor).toBeDefined();
      expect((metadataProcessor as { set: { value: unknown } }).set.value).toEqual({});
    });
  });

  describe('Summary pipeline template', () => {
    it('includes slo.metadata in the summary pipeline processors', () => {
      const slo = createSLO({
        metadata: { env: 'production', region: 'us-east-1' },
      });

      const basePath = httpServiceMock.createBasePath();
      const pipeline = getSummaryPipelineTemplate(slo, 'default', basePath);
      const metadataProcessor = pipeline.processors?.find(
        (p) => 'set' in p && (p.set as { field: string }).field === 'slo.metadata'
      );

      expect(metadataProcessor).toBeDefined();
      expect((metadataProcessor as { set: { value: unknown } }).set.value).toEqual({
        env: 'production',
        region: 'us-east-1',
      });
    });
  });

  describe('Temp summary document', () => {
    it('includes metadata in the temp summary document', () => {
      const slo = createSLO({
        metadata: { product: 'search', tier: 'premium' },
      });

      const basePath = httpServiceMock.createBasePath();
      const doc = createTempSummaryDocument(slo, 'default', basePath);

      expect(doc.slo.metadata).toEqual({ product: 'search', tier: 'premium' });
    });

    it('sets empty metadata when SLO has no metadata', () => {
      const slo = createSLO();
      const basePath = httpServiceMock.createBasePath();
      const doc = createTempSummaryDocument(slo, 'default', basePath);

      expect(doc.slo.metadata).toEqual({});
    });
  });
});
