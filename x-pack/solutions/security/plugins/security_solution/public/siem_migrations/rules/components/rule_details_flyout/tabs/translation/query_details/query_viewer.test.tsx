/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { QueryViewer } from './query_viewer';

describe('QueryViewer', () => {
  const mockOnEdit = jest.fn();

  it('renders the rule name correctly', () => {
    const { getByTestId } = render(
      <QueryViewer ruleName="Test Rule" language="spl" query="test query" />
    );

    expect(getByTestId('queryViewerTitle')).toBeInTheDocument();
    expect(getByTestId('queryViewerTitle')).toHaveTextContent('Test Rule');
  });

  it('renders the "Edit" button when onEdit is provided and calls onEdit when clicked', () => {
    const { getByTestId } = render(
      <QueryViewer ruleName="Test Rule" language="esql" query="test query" onEdit={mockOnEdit} />
    );

    const editButton = getByTestId('editTranslatedRuleButton');
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveTextContent('Edit');

    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('does not render the "Edit" button when onEdit is not provided', () => {
    const { queryByTestId } = render(
      <QueryViewer ruleName="Test Rule" language="esql" query="test query" />
    );

    expect(queryByTestId('editTranslatedRuleButton')).not.toBeInTheDocument();
  });

  it('renders the placeholder when the query is empty', () => {
    const { getByTestId } = render(
      <QueryViewer
        ruleName="Test Rule"
        language="esql"
        query=""
        queryPlaceholder="No query available"
      />
    );

    expect(getByTestId('queryViewerQueryPlaceholder')).toBeInTheDocument();
    expect(getByTestId('queryViewerQueryPlaceholder')).toHaveTextContent('No query available');
  });

  it('renders the code block when query is not empty', () => {
    const { getByTestId } = render(
      <QueryViewer ruleName="Test Rule" language="spl" query="test query" />
    );

    expect(getByTestId('translatedRuleQueryViewer')).toBeInTheDocument();
    expect(getByTestId('translatedRuleQueryViewer')).toHaveTextContent('test query');
  });
});
