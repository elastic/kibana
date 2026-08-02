/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { PndDiscoveryContextEntity } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { PND_HITL_DISCOVERY_CONTEXT } from '../test_helpers/pnd_hitl_proposal';
import { BlastRadiusLines, MAX_BLAST_RADIUS_LINES } from '.';

const { entities } = PND_HITL_DISCOVERY_CONTEXT;

const defaultProps = {
  entities,
  iconColor: '#bd271e',
};

/** `MAX_BLAST_RADIUS_LINES + 3` entities, so the overflow line has something to count. */
const manyEntities: PndDiscoveryContextEntity[] = Array.from(
  { length: MAX_BLAST_RADIUS_LINES + 3 },
  (_, index) => ({ count: 10 - index, field: 'host.name', value: `host-${index}` })
);

describe('BlastRadiusLines', () => {
  it('renders one line per entity', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.getAllByTestId('hitlActionCardEntity')).toHaveLength(entities.length);
  });

  it('renders the entity value', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.getByText('host-1')).toBeInTheDocument();
  });

  it('renders the human label for a known ECS field', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('renders how many constituent alerts carry the entity', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.getByText('9 alerts')).toBeInTheDocument();
  });

  it('renders the singular alert count', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.getByText('1 alert')).toBeInTheDocument();
  });

  it('renders the empty state when there are no entities', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} entities={[]} />);

    expect(screen.getByTestId('hitlActionCardBlastRadiusEmpty')).toBeInTheDocument();
  });

  it('renders no lines when there are no entities', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} entities={[]} />);

    expect(screen.queryByTestId('hitlActionCardEntity')).not.toBeInTheDocument();
  });

  it('renders no empty state when there are entities', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.queryByTestId('hitlActionCardBlastRadiusEmpty')).not.toBeInTheDocument();
  });

  it('caps the visible lines', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} entities={manyEntities} />);

    expect(screen.getAllByTestId('hitlActionCardEntity')).toHaveLength(MAX_BLAST_RADIUS_LINES);
  });

  it('counts the entities it did not draw', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} entities={manyEntities} />);

    expect(screen.getByTestId('hitlActionCardBlastRadiusOverflow')).toHaveTextContent(
      '3 more entities'
    );
  });

  it('renders no overflow line when every entity fits', () => {
    renderWithPndProviders(<BlastRadiusLines {...defaultProps} />);

    expect(screen.queryByTestId('hitlActionCardBlastRadiusOverflow')).not.toBeInTheDocument();
  });

  it('renders an unmapped ECS field under its own name', () => {
    renderWithPndProviders(
      <BlastRadiusLines
        {...defaultProps}
        entities={[{ count: 1, field: 'process.name', value: 'mimikatz.exe' }]}
      />
    );

    expect(screen.getByText('process.name')).toBeInTheDocument();
  });
});
