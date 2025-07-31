/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnowledgeBaseEntryReference } from './knowledge_base_entry_reference';
import { useKibana } from '../../../../context/typed_kibana_context/typed_kibana_context';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import type { KnowledgeBaseEntryContentReference } from '@kbn/elastic-assistant-common';
import { SecurityPageName } from '@kbn/deeplinks-security';

// Mocks
jest.mock('@kbn/elastic-assistant');
jest.mock('../../../../context/typed_kibana_context/typed_kibana_context');

const mockNavigateToApp = jest.fn();

const mockUseKibana = useKibana as jest.Mock;
const mockUseAssistantContext = useAssistantContext as jest.Mock;

const defaultProps = {
  contentReferenceNode: {
    type: 'contentReference',
    contentReferenceId: 'hi',
    contentReferenceCount: 1,
    contentReferenceBlock: `{reference(1)}`,
    contentReference: {
      knowledgeBaseEntryId: 'entry-123',
      knowledgeBaseEntryName: 'Test Entry',
    },
  } as unknown as ResolvedContentReferenceNode<KnowledgeBaseEntryContentReference>,
};

describe('KnowledgeBaseEntryReference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: true },
    });
  });

  it('renders PopoverReference and EuiLink with correct label', () => {
    render(<KnowledgeBaseEntryReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    const link = screen.getByTestId('knowledgeBaseEntryReferenceLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Knowledge base entry: Test Entry');
  });

  it('calls navigateToApp with securitySolutionUI when hasSearchAILakeConfigurations is true', () => {
    render(<KnowledgeBaseEntryReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('knowledgeBaseEntryReferenceLink'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.configurationsAiSettings,
      path: '?tab=knowledge_base&entry_search_term=entry-123',
      openInNewTab: true,
    });
  });

  it('calls navigateToApp with management when hasSearchAILakeConfigurations is false', () => {
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: false },
    });
    render(<KnowledgeBaseEntryReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('knowledgeBaseEntryReferenceLink'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: 'kibana/securityAiAssistantManagement?tab=knowledge_base&entry_search_term=entry-123',
      openInNewTab: true,
    });
  });
});
