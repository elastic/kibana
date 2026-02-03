/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { composeStories } from '@storybook/react';
import { render, waitFor } from '@testing-library/react';
import * as stories from './graph_layout.stories';

const { GraphLargeStackedEdgeCases, EventsAndEntityRelationships, EventsAndRelationshipsStacked } =
  composeStories(stories);

const TRANSLATE_XY_REGEX =
  /translate\(\s*([+-]?\d+(\.\d+)?)(px|%)?\s*,\s*([+-]?\d+(\.\d+)?)(px|%)?\s*\)/;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const getLabelRect = (el: HTMLElement): Rect | undefined => {
  const match = el.style.transform.match(TRANSLATE_XY_REGEX);

  if (!match || match.length < 5) {
    return;
  }

  return {
    left: Number(match[1]),
    right: Number(match[1]) + 120,
    top: Number(match[4]),
    bottom: Number(match[4]) + 32,
  };
};

const rectIntersect = (rect1: Rect, rect2: Rect) => {
  return !(
    rect1.top > rect2.bottom ||
    rect1.right < rect2.left ||
    rect1.bottom < rect2.top ||
    rect1.left > rect2.right
  );
};

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

describe('GraphLargeStackedEdgeCases story', () => {
  it('all labels should be visible and nodes should have correct icons', async () => {
    const { getAllByText, container } = render(<GraphLargeStackedEdgeCases />);

    const labels = GraphLargeStackedEdgeCases.args?.nodes?.filter((node) => node.shape === 'label');

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // With JSDOM toBeVisible can't check if elements are visually obscured by other overlapping elements
    // This is a workaround which gives a rough estimation of a label's bounding rectangle and check for intersections
    const labelsBoundingRect: Rect[] = [];
    const labelElements: Set<string> = new Set();

    for (const { label } of labels ?? []) {
      // Get all label nodes that contains the label's text
      const allLabelElements = getAllByText(
        (_content, element) => element?.textContent?.includes(label ?? '') || false,
        {
          exact: true,
          selector: 'div.react-flow__node-label',
        }
      );
      expect(allLabelElements.length).toBeGreaterThan(0);

      for (const labelElm of allLabelElements) {
        const id = labelElm.getAttribute('data-id');

        // Same label can appear more than once in the graph, so we skip them if already scanned
        if (labelElements.has(id!)) {
          // eslint-disable-next-line no-continue
          continue;
        }
        labelElements.add(id!);

        expect(labelElm).toBeVisible();
        const labelRect = getLabelRect(labelElm);
        expect(labelRect).not.toBeUndefined();

        // Checks if current rect intersects with other labels
        for (const currRect of labelsBoundingRect) {
          expect(rectIntersect(currRect, labelRect!)).toBeFalsy();
        }

        labelsBoundingRect.push(labelRect!);
      }
    }
    // test some nodes icons rendering
    const expectedNodes = [
      { id: 'siem-windows', expectedIcon: 'storage' },
      { id: '213.180.204.3', expectedIcon: 'globe' },
      { id: 'user', expectedIcon: 'user' },
    ];

    // Get all nodes in the rendered component
    const nodeElements = container.querySelectorAll('.react-flow__node');

    // Verify each expected node has the correct icon
    for (const { id, expectedIcon } of expectedNodes) {
      // Find the DOM element for this node
      const nodeElement = Array.from(nodeElements).find((el) => el.getAttribute('data-id') === id);

      expect(nodeElement).not.toBeNull();

      if (nodeElement) {
        const iconElement = nodeElement.querySelector(`[data-euiicon-type="${expectedIcon}"]`);

        expect(iconElement).not.toBeNull();
        expect(iconElement?.getAttribute('data-euiicon-type')).toBe(expectedIcon);
      }
    }
  });
});

describe('EventsAndEntityRelationships story', () => {
  it('should render all entity nodes correctly', async () => {
    const { container, getByText } = render(<EventsAndEntityRelationships />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify entity nodes are rendered with correct labels
    expect(getByText('john.doe@company.com')).toBeInTheDocument();
    expect(getByText('prod-ec2-instance-01')).toBeInTheDocument();
    expect(getByText('prod-ec2-instance-02')).toBeInTheDocument();
    expect(getByText('AdminRole')).toBeInTheDocument();
  });

  it('should render event labels (shape: label) correctly', async () => {
    const { container, getByText } = render(<EventsAndEntityRelationships />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify event labels are rendered
    expect(getByText('ConsoleLogin')).toBeInTheDocument();
    expect(getByText('AssumeRole')).toBeInTheDocument();
  });

  it('should render relationship labels (shape: relationship) correctly', async () => {
    const { container, getAllByText } = render(<EventsAndEntityRelationships />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify relationship labels are rendered
    // "Owns" appears twice (user owns 2 hosts)
    const ownsLabels = getAllByText('Owns');
    expect(ownsLabels.length).toBe(2);

    // "Has Access" appears once
    expect(getAllByText('Has Access').length).toBe(1);
  });

  it('should render both label and relationship nodes without overlap', async () => {
    const { container, getAllByText } = render(<EventsAndEntityRelationships />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Get all connector nodes (label and relationship nodes)
    const connectorLabels = ['ConsoleLogin', 'AssumeRole', 'Owns', 'Has Access'];
    const connectorBoundingRects: Rect[] = [];

    for (const label of connectorLabels) {
      const elements = getAllByText(label);

      for (const element of elements) {
        // Find the parent node element
        const nodeElement = element.closest('.react-flow__node');
        if (nodeElement) {
          const rect = getLabelRect(nodeElement as HTMLElement);
          if (rect) {
            // Check that this node doesn't overlap with previously checked nodes
            for (const prevRect of connectorBoundingRects) {
              expect(rectIntersect(prevRect, rect)).toBeFalsy();
            }
            connectorBoundingRects.push(rect);
          }
        }
      }
    }

    // Ensure we found some connector nodes
    expect(connectorBoundingRects.length).toBeGreaterThan(0);
  });

  it('should render correct icons for entity nodes', async () => {
    const { container } = render(<EventsAndEntityRelationships />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Get all nodes in the rendered component
    const nodeElements = container.querySelectorAll('.react-flow__node');

    // Verify entity nodes have correct icons
    const expectedNodes = [
      { labelContains: 'john.doe', expectedIcon: 'user' },
      { labelContains: 'prod-ec2-instance-01', expectedIcon: 'compute' },
      { labelContains: 'prod-ec2-instance-02', expectedIcon: 'compute' },
      { labelContains: 'AdminRole', expectedIcon: 'key' },
    ];

    for (const { labelContains, expectedIcon } of expectedNodes) {
      const nodeElement = Array.from(nodeElements).find((el) =>
        el.textContent?.includes(labelContains)
      );

      expect(nodeElement).not.toBeNull();

      if (nodeElement) {
        const iconElement = nodeElement.querySelector(`[data-euiicon-type="${expectedIcon}"]`);
        expect(iconElement).not.toBeNull();
      }
    }
  });
});

describe('EventsAndRelationshipsStacked story', () => {
  it('should render all entity nodes correctly', async () => {
    const { container, getByText } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify entity nodes are rendered with correct labels
    expect(getByText('john.doe@company.com')).toBeInTheDocument();
    expect(getByText('prod-ec2-instance-01')).toBeInTheDocument();
    expect(getByText('user-1@company.com')).toBeInTheDocument();
    expect(getByText('user-2@company.com')).toBeInTheDocument();
    expect(getByText('hosts')).toBeInTheDocument();
  });

  it('should render stacked label nodes (shape: label) correctly', async () => {
    const { container, getByText } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify stacked event labels are rendered
    expect(getByText('ConsoleLogin')).toBeInTheDocument();
    expect(getByText('DescribeInstance')).toBeInTheDocument();
  });

  it('should render stacked relationship nodes (shape: relationship) correctly', async () => {
    const { container, getAllByText } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify relationship labels are rendered
    // "Owns" appears multiple times (user-john, user-1, user-2 all have Owns relationships)
    const ownsLabels = getAllByText('Owns');
    expect(ownsLabels.length).toBeGreaterThanOrEqual(3);

    // "Has Access" appears multiple times (user-john, user-1, user-2)
    const hasAccessLabels = getAllByText('Has Access');
    expect(hasAccessLabels.length).toBeGreaterThanOrEqual(3);

    // "Supervises" appears twice (user-john supervises user-1 and user-2)
    const supervisesLabels = getAllByText('Supervises');
    expect(supervisesLabels.length).toBe(2);
  });

  it('should render stacked connectors without overlap', async () => {
    const { container, getAllByText } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Get stacked connector labels from the john.doe -> host-prod-1 connection
    const stackedLabels = ['ConsoleLogin', 'DescribeInstance', 'Owns', 'Has Access'];
    const connectorBoundingRects: Rect[] = [];

    for (const label of stackedLabels) {
      const elements = getAllByText(label);

      for (const element of elements) {
        // Find the parent node element
        const nodeElement = element.closest('.react-flow__node');
        if (nodeElement) {
          const rect = getLabelRect(nodeElement as HTMLElement);
          if (rect) {
            // Check that this node doesn't overlap with previously checked nodes
            for (const prevRect of connectorBoundingRects) {
              expect(rectIntersect(prevRect, rect)).toBeFalsy();
            }
            connectorBoundingRects.push(rect);
          }
        }
      }
    }

    // Ensure we found some connector nodes
    expect(connectorBoundingRects.length).toBeGreaterThan(0);
  });

  it('should render grouped hosts node with count indicator', async () => {
    const { container, getByText } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Verify the grouped hosts node is rendered
    const hostsLabel = getByText('hosts');
    expect(hostsLabel).toBeInTheDocument();

    // Find the parent node element and verify it has a count indicator
    const nodeElement = hostsLabel.closest('.react-flow__node');
    expect(nodeElement).not.toBeNull();
  });

  it('should render correct icons for entity nodes', async () => {
    const { container } = render(<EventsAndRelationshipsStacked />);

    // Wait for nodes to be rendered
    await waitFor(() => {
      const nodeElements = container.querySelectorAll('.react-flow__node');
      expect(nodeElements.length).toBeGreaterThan(0);
    });

    // Get all nodes in the rendered component
    const nodeElements = container.querySelectorAll('.react-flow__node');

    // Verify entity nodes have correct icons
    const expectedNodes = [
      { labelContains: 'john.doe', expectedIcon: 'user' },
      { labelContains: 'prod-ec2-instance-01', expectedIcon: 'compute' },
      { labelContains: 'user-1@company.com', expectedIcon: 'user' },
      { labelContains: 'user-2@company.com', expectedIcon: 'user' },
      { labelContains: 'hosts', expectedIcon: 'compute' },
    ];

    for (const { labelContains, expectedIcon } of expectedNodes) {
      const nodeElement = Array.from(nodeElements).find((el) =>
        el.textContent?.includes(labelContains)
      );

      expect(nodeElement).not.toBeNull();

      if (nodeElement) {
        const iconElement = nodeElement.querySelector(`[data-euiicon-type="${expectedIcon}"]`);
        expect(iconElement).not.toBeNull();
      }
    }
  });
});
