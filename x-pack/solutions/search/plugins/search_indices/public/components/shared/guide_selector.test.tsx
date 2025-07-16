/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuideSelector } from './guide_selector';

// Mock the workflows import
jest.mock('../../code_examples/workflows', () => ({
  workflows: [
    {
      id: 'default',
      title: 'Keyword Search',
      summary: 'Set up an index in Elasticsearch using the text field mapping.',
    },
    {
      id: 'vector',
      title: 'Vector Search',
      summary: 'Set up an index in Elasticsearch using the dense_vector field mapping.',
    },
    {
      id: 'semantic',
      title: 'Semantic Search',
      summary:
        "Use a semantic_text field type and Elastic's built-in ELSER machine learning model.",
    },
  ],
}));

describe('GuideSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets selected workflow from query param', () => {
    const workflowId = 'vector';

    render(
      <MemoryRouter initialEntries={[`/data?workflow=${workflowId}`]}>
        <GuideSelector selectedWorkflowId="vector" onChange={mockOnChange} showTour={false} />
      </MemoryRouter>
    );

    // Find the Vector Search card
    const vectorSearchCard = screen.getByText('Vector Search');
    expect(vectorSearchCard).toBeInTheDocument();

    // Check if the Vector Search card is selected by looking for the "Selected" button
    const selectedButton = screen.getByText('Selected');
    expect(selectedButton).toBeInTheDocument();

    // Verify the selected button is within the Vector Search card
    const cardElement = vectorSearchCard.closest('.euiCard');
    const buttonElement = selectedButton.closest('button');
    expect(cardElement).toContainElement(buttonElement);
  });

  it('does not select other workflows when vector is selected', () => {
    const workflowId = 'vector';

    render(
      <MemoryRouter initialEntries={[`/data?workflow=${workflowId}`]}>
        <GuideSelector selectedWorkflowId="vector" onChange={mockOnChange} showTour={false} />
      </MemoryRouter>
    );

    // Check that only one "Selected" button exists (for the vector workflow)
    const selectedButtons = screen.getAllByText('Selected');
    expect(selectedButtons).toHaveLength(1);

    // Verify the selected button is within the Vector Search card
    const vectorSearchCard = screen.getByText('Vector Search');
    const cardElement = vectorSearchCard.closest('.euiCard');
    expect(cardElement).toContainElement(selectedButtons[0]);
  });
});
