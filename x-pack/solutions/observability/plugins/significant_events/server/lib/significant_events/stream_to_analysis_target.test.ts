/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { sourceToAnalysisTarget } from './stream_to_analysis_target';

describe('sourceToAnalysisTarget', () => {
  it('uses the stored view for both sources and sampling', () => {
    const source = {
      id: 'source-1',
      title: 'Checkout',
      description: 'Checkout logs',
      view_name: '$.nightshift.sources.default.checkout',
    } as NightshiftSource;

    expect(sourceToAnalysisTarget(source)).toEqual({
      id: 'source-1',
      name: 'Checkout',
      description: 'Checkout logs',
      sources: ['$.nightshift.sources.default.checkout'],
      samplingSource: '$.nightshift.sources.default.checkout',
    });
  });
});
