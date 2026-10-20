/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineDataResponse } from '../../../../hooks/use_pipeline_data';
import { getGenerationBadgeLabel, getValidationBadgeLabel } from '.';

const basePipelineData: PipelineDataResponse = {
  alert_retrieval: null,
  combined_alerts: null,
  generation: null,
  validated_discoveries: null,
};

describe('getGenerationBadgeLabel', () => {
  it('returns null when generation is null', () => {
    expect(getGenerationBadgeLabel(basePipelineData)).toBeNull();
  });

  it('returns "0 discoveries" when attack_discoveries is empty', () => {
    const data: PipelineDataResponse = {
      ...basePipelineData,
      generation: {
        attack_discoveries: [],
        execution_uuid: 'uuid',
        replacements: {},
      },
    };

    expect(getGenerationBadgeLabel(data)).toBe('0 discoveries');
  });

  it('returns "1 discovery" for a single discovery', () => {
    const data: PipelineDataResponse = {
      ...basePipelineData,
      generation: {
        attack_discoveries: [
          {
            alert_ids: ['a1'],
            details_markdown: 'd',
            summary_markdown: 's',
            title: 'T',
          },
        ],
        execution_uuid: 'uuid',
        replacements: {},
      },
    };

    expect(getGenerationBadgeLabel(data)).toBe('1 discovery');
  });

  it('returns "7 discoveries" for multiple discoveries', () => {
    const discoveries = Array.from({ length: 7 }, (_, idx) => ({
      alert_ids: [`a${idx}`],
      details_markdown: 'd',
      summary_markdown: 's',
      title: `T${idx}`,
    }));

    const data: PipelineDataResponse = {
      ...basePipelineData,
      generation: {
        attack_discoveries: discoveries,
        execution_uuid: 'uuid',
        replacements: {},
      },
    };

    expect(getGenerationBadgeLabel(data)).toBe('7 discoveries');
  });
});

describe('getValidationBadgeLabel', () => {
  it('returns null when validated_discoveries is null', () => {
    expect(getValidationBadgeLabel(basePipelineData)).toBeNull();
  });

  it('returns "0 discoveries" when validated_discoveries is empty', () => {
    const data: PipelineDataResponse = {
      ...basePipelineData,
      validated_discoveries: [],
    };

    expect(getValidationBadgeLabel(data)).toBe('0 discoveries');
  });

  it('returns "1 discovery" for a single validated discovery', () => {
    const data: PipelineDataResponse = {
      ...basePipelineData,
      validated_discoveries: [{ title: 'V1' }],
    };

    expect(getValidationBadgeLabel(data)).toBe('1 discovery');
  });

  it('returns "5 discoveries" for multiple validated discoveries', () => {
    const data: PipelineDataResponse = {
      ...basePipelineData,
      validated_discoveries: Array.from({ length: 5 }, (_, idx) => ({ title: `V${idx}` })),
    };

    expect(getValidationBadgeLabel(data)).toBe('5 discoveries');
  });
});
