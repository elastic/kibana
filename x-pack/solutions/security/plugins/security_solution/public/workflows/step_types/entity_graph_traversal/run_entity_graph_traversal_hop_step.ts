/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { runEntityGraphTraversalHopStepCommonDefinition } from '../../../../common/workflows/step_types/entity_graph_traversal/run_entity_graph_traversal_hop_step_common';

export const runEntityGraphTraversalHopStepDefinition: PublicStepDefinition = {
  ...runEntityGraphTraversalHopStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/branch').then(({ icon }) => ({
      default: icon,
    }))
  ),
};
