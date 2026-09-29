import React from 'react';
import { render } from '@testing-library/react';
import { Graph } from '../graph/graph';
import { graphSample } from '../mock/graph_sample';

it('debug', async () => {
  const { container } = render(<Graph {...graphSample} interactive={true} showMinimap={true} />);
  await new Promise((r) => setTimeout(r, 1500));
  console.log('ent=' + container.querySelectorAll('.react-flow__node').length);
});
