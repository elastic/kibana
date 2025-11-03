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

const { GraphLargeStackedEdgeCases } = composeStories(stories);

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
