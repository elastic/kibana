/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as stories from './graph_layout.stories';
import type { MappedAssetProps } from '@kbn/cloud-security-posture-common/types/assets';

const { GraphLargeStackedEdgeCases, GraphWithAssetInventoryData } = composeStories(stories);

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
  it('all labels should be visible', async () => {
    const { getAllByText } = render(<GraphLargeStackedEdgeCases />);

    const labels = GraphLargeStackedEdgeCases.args?.nodes?.filter((node) => node.shape === 'label');

    // With JSDOM toBeVisible can't check if elements are visually obscured by other overlapping elements
    // This is a workaround which gives a rough estimation of a label's bounding rectangle and check for intersections
    const labelsBoundingRect: Rect[] = [];
    const labelElements: Set<string> = new Set();

    for (const { label } of labels ?? []) {
      // Get all label nodes that contains the label's text
      const allLabelElements = getAllByText((_content, element) => element?.textContent === label, {
        exact: true,
        selector: 'div.react-flow__node-label',
      });
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
  });
});

describe('GraphWithAssetInventoryData story', () => {
  it('should display entity names for nodes with asset data', async () => {
    const { container } = render(<GraphWithAssetInventoryData />);

    // Extract the nodes with asset data from the story
    const nodes = GraphWithAssetInventoryData.args?.nodes ?? [];
    const nodesWithAssetData = nodes.filter((node) => {
      if (!('documentsData' in node) || !node.documentsData || !Array.isArray(node.documentsData)) {
        return false;
      }
      return node.documentsData.some((doc) => doc.assetData !== undefined);
    });

    // We expect to find three nodes with asset data (indices 0, 2, and 4 from the baseGraph)
    expect(nodesWithAssetData.length).toBe(3);

    // Get all ellipse nodes in the rendered component
    const nodeElements = container.querySelectorAll('.react-flow__node');

    // For each node with asset data, verify the entity name is displayed
    for (const node of nodesWithAssetData) {
      // Find the DOM element for this node
      const nodeElement = Array.from(nodeElements).find(
        (el) => el.getAttribute('data-id') === node.id
      );

      expect(nodeElement).not.toBeNull();

      if (nodeElement) {
        // Find the EuiText element within this node
        const textElement = nodeElement.querySelector('.euiText');

        // Get the node's asset data from the first document that has it
        const docs = node.documentsData as Array<{ assetData?: MappedAssetProps }>;
        const documentWithAssetData = docs?.find((doc) => doc.assetData);
        const assetData = documentWithAssetData?.assetData;
        const expectedEntityName = assetData?.entityName;
        expect(expectedEntityName).toBeDefined();

        // Check that the EuiText element contains the entity name
        expect(textElement).not.toBeNull();
        expect(textElement?.textContent).toContain(expectedEntityName);
      }
    }
  });

  it('should render nodes labels without asset data', async () => {
    const { container } = render(<GraphWithAssetInventoryData />);

    // Extract nodes without asset data (excluding label and group nodes)
    const nodes = GraphWithAssetInventoryData.args?.nodes ?? [];
    const regularNodes = nodes.filter((node) => {
      // Skip label and group nodes
      if (node.shape === 'label' || node.shape === 'group') {
        return false;
      }

      // Check if node has no documents with asset data
      if (!('documentsData' in node) || !node.documentsData || !Array.isArray(node.documentsData)) {
        return true;
      }

      return !node.documentsData.some((doc) => doc.assetData !== undefined);
    });

    // We should have nodes without asset data
    expect(regularNodes.length).toBeGreaterThan(0);

    // Get all node elements in the rendered component
    const nodeElements = container.querySelectorAll('.react-flow__node');

    // Check that each node is rendered in the DOM
    for (const node of regularNodes) {
      // Find the DOM element for this node
      const nodeElement = Array.from(nodeElements).find(
        (el) => el.getAttribute('data-id') === node.id
      );

      // Verify the node is in the document
      expect(nodeElement).not.toBeNull();

      // For nodes with labels, verify the label is displayed
      if (node.label) {
        expect(nodeElement?.textContent).toContain(node.label);
      }
    }
  });
});
