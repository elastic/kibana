/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('resource_installation', () => {
    it('creates slo component templates', () => {
      // .slo-observability.sli-mappings ->  event.ingested
      // .slo-observability.sli-settings
      // .slo-observability.summary-mappings
      // .slo-observability.summary-settings
      // .alerts-observability.slo.alerts-mappings
    });
  });
}
