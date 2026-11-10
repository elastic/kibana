/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

type ProfilingSection = 'stacktraces' | 'flamegraphs' | 'functions';

/** Interactions with the profiling entries of the Observability side navigation. */
export class ProfilingSideNav {
  constructor(private readonly page: ScoutPage) {}

  async gotoSection(section: ProfilingSection) {
    await this.page.getByTestId(`observability-nav-profiling-${section}`).click();
  }
}
