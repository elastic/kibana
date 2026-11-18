/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { EntityNodeViewModel, LabelNodeViewModel, NodeViewModel } from '../types';
import {
  GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID,
  GRAPH_CALLOUT_NO_DATA_ID,
  GRAPH_CALLOUT_NO_RELATIONSHIPS_ID,
  GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID,
} from '../test_ids';
import { GraphCallouts } from './graph_callouts';

const EUI_DISMISS_CALLOUT_BUTTON_ID = 'euiDismissCalloutButton';

const createEntityNode = (overrides: Partial<EntityNodeViewModel> = {}): EntityNodeViewModel => ({
  id: 'user:alice',
  label: 'alice',
  color: 'primary',
  shape: 'ellipse',
  tag: 'User',
  riskScore: { min: 50, max: 50 },
  ...overrides,
});

const createUnknownTargetNode = (): EntityNodeViewModel => ({
  id: 'unknown-1',
  label: 'Unknown',
  color: 'primary',
  shape: 'rectangle',
  documentsData: [],
});

const createLabelNode = (): LabelNodeViewModel => ({
  id: 'label-1',
  label: 'ConsoleLogin',
  color: 'primary',
  shape: 'label',
});

const renderCallouts = (nodes: NodeViewModel[] | undefined, isFetching = false) =>
  render(<GraphCallouts nodes={nodes} isFetching={isFetching} />);

const dismissCallout = (calloutTestId: string) => {
  fireEvent.click(
    within(screen.getByTestId(calloutTestId)).getByTestId(EUI_DISMISS_CALLOUT_BUTTON_ID)
  );
};

describe('GraphCallouts', () => {
  describe('while data is not settled', () => {
    it('renders nothing before the first response arrives', () => {
      const { container } = renderCallouts(undefined);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while fetching', () => {
      const { container } = renderCallouts([], true);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('no data callout', () => {
    it('renders when the graph has no nodes', () => {
      renderCallouts([]);

      expect(screen.getByTestId(GRAPH_CALLOUT_NO_DATA_ID)).toHaveTextContent(
        'No data available · No events were found.'
      );
      expect(screen.queryByTestId(GRAPH_CALLOUT_NO_RELATIONSHIPS_ID)).not.toBeInTheDocument();
    });

    it('hides after being dismissed', () => {
      renderCallouts([]);

      dismissCallout(GRAPH_CALLOUT_NO_DATA_ID);

      expect(screen.queryByTestId(GRAPH_CALLOUT_NO_DATA_ID)).not.toBeInTheDocument();
    });
  });

  describe('no relationships callout', () => {
    it('renders when the graph contains only entity nodes', () => {
      renderCallouts([createEntityNode()]);

      expect(screen.getByTestId(GRAPH_CALLOUT_NO_RELATIONSHIPS_ID)).toHaveTextContent(
        'No resolution group found'
      );
      expect(screen.queryByTestId(GRAPH_CALLOUT_NO_DATA_ID)).not.toBeInTheDocument();
    });

    it('does not render when the graph contains connector nodes', () => {
      renderCallouts([createEntityNode(), createLabelNode()]);

      expect(screen.queryByTestId(GRAPH_CALLOUT_NO_RELATIONSHIPS_ID)).not.toBeInTheDocument();
    });

    it('hides after being dismissed', () => {
      renderCallouts([createEntityNode()]);

      dismissCallout(GRAPH_CALLOUT_NO_RELATIONSHIPS_ID);

      expect(screen.queryByTestId(GRAPH_CALLOUT_NO_RELATIONSHIPS_ID)).not.toBeInTheDocument();
    });
  });

  describe('entity metadata unavailable callout', () => {
    it('renders when an entity is missing all metadata fields', () => {
      renderCallouts([createEntityNode({ riskScore: undefined }), createLabelNode()]);

      expect(screen.getByTestId(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID)).toHaveTextContent(
        'Entity metadata not available yet'
      );
    });

    it.each<[string, Partial<EntityNodeViewModel>]>([
      [
        'sub type',
        { documentsData: [{ id: 'doc-1', type: 'entity', entity: { sub_type: 'IAM User' } }] },
      ],
      [
        'source',
        { documentsData: [{ id: 'doc-1', type: 'entity', entity: { sources: ['aws'] } }] },
      ],
      ['IP address', { ips: ['10.0.0.1'] }],
      ['geolocation', { countryCodes: ['US'] }],
      ['asset criticality', { assetCriticality: [{ level: 'high_impact', count: 1 }] }],
      ['risk score', { riskScore: { min: 10, max: 10 } }],
    ])('does not render when the entity has a %s', (_field, metadata) => {
      renderCallouts([createEntityNode({ riskScore: undefined, ...metadata }), createLabelNode()]);

      expect(screen.queryByTestId(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID)).not.toBeInTheDocument();
    });

    it('does not render for unknown target nodes', () => {
      renderCallouts([createEntityNode(), createLabelNode(), createUnknownTargetNode()]);

      expect(screen.queryByTestId(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID)).not.toBeInTheDocument();
    });

    it('hides after being dismissed', () => {
      renderCallouts([createEntityNode({ riskScore: undefined }), createLabelNode()]);

      dismissCallout(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID);

      expect(screen.queryByTestId(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID)).not.toBeInTheDocument();
    });
  });

  describe('unknown entities callout', () => {
    it('renders when the graph contains an unknown target node', () => {
      renderCallouts([createEntityNode(), createLabelNode(), createUnknownTargetNode()]);

      expect(screen.getByTestId(GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID)).toHaveTextContent(
        'Unknown entities detected · Some target entities could not be identified'
      );
    });

    it('does not render when every entity node is tagged', () => {
      renderCallouts([createEntityNode(), createLabelNode()]);

      expect(screen.queryByTestId(GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID)).not.toBeInTheDocument();
    });

    it('hides after being dismissed without affecting other callouts', () => {
      renderCallouts([
        createEntityNode({ riskScore: undefined }),
        createLabelNode(),
        createUnknownTargetNode(),
      ]);

      dismissCallout(GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID);

      expect(screen.queryByTestId(GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID)).not.toBeInTheDocument();
      expect(screen.getByTestId(GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID)).toBeInTheDocument();
    });
  });
});
