/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Graph } from '../graph/graph';
import { graphSample } from '../mock/graph_sample';

it('debug', async () => {
  const { container } = render(<Graph {...graphSample} interactive={true} showMinimap={true} />);
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`ent=${container.querySelectorAll('.react-flow__node').length}`);
});
