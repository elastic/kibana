/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiDescriptionList } from '@elastic/eui';
import type { Feature, TopologyProvenance } from '@kbn/significant-events-schema';
import { useTopologyFeatures } from '../../../data/topology/use_topology_features';
import { useProvenanceDetails } from './provenance_details';

jest.mock('../../../data/topology/use_topology_features');

const provenance = (sourceId: string, uuid: string): TopologyProvenance => ({
  source_id: sourceId,
  feature_id: 'constructor',
  feature_uuid: uuid,
  confidence: 96,
});

const sourceTitles = new Map([
  ['source-a', 'Logging CPHosted'],
  ['source-b', 'Logging AMS'],
]);

const Details = ({ entries }: { entries: TopologyProvenance[] }) => (
  <EuiDescriptionList listItems={useProvenanceDetails(entries, sourceTitles)} />
);

beforeEach(() => {
  jest.mocked(useTopologyFeatures).mockReturnValue({
    isLoading: false,
    data: {
      features: [
        {
          uuid: 'uuid-a',
          properties: { image: 'docker.elastic.co/cloud-ci/constructor', ports: [8080] },
        } as Partial<Feature> as Feature,
      ],
    },
  } as unknown as ReturnType<typeof useTopologyFeatures>);
});

it('renders one Properties row with a line per property', () => {
  render(<Details entries={[provenance('source-a', 'uuid-a')]} />);

  expect(screen.getByText('Logging CPHosted: constructor (confidence 96)')).toBeInTheDocument();
  expect(screen.getByText('Properties')).toBeInTheDocument();
  expect(screen.getByText(/docker\.elastic\.co\/cloud-ci\/constructor/)).toBeInTheDocument();
  expect(screen.getByText(/\[8080\]/)).toBeInTheDocument();
});

it('labels Properties rows by source when several KIs were merged', () => {
  render(
    <Details entries={[provenance('source-a', 'uuid-a'), provenance('source-b', 'uuid-b')]} />
  );

  expect(screen.getByText('Properties (Logging CPHosted)')).toBeInTheDocument();
  expect(screen.getByText('Properties (Logging AMS)')).toBeInTheDocument();
  expect(screen.getByText('Properties unavailable')).toBeInTheDocument();
});
