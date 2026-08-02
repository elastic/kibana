/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithPndProviders } from '../../../components/test_utils/render_with_pnd_providers';
import { AskPndChat } from './ask_pnd_chat';

interface MockEmbeddableConversationProps {
  onClose?: () => void;
}

const EmbeddableConversation: React.FC<MockEmbeddableConversationProps> = ({ onClose }) => (
  <div data-test-subj="mockEmbeddableConversation">
    <button data-test-subj="mockEmbeddableConversationClose" onClick={onClose} type="button">
      {'Close'}
    </button>
  </div>
);

const servicesWithAgentBuilder = { agentBuilder: { EmbeddableConversation } };

describe('AskPndChat', () => {
  it('renders the toggle', () => {
    renderWithPndProviders(<AskPndChat />, { services: servicesWithAgentBuilder });

    expect(screen.getByTestId('pndAskPndToggle')).toBeInTheDocument();
  });

  it('does not mount the chat until it is asked for, so the list is what loads first', () => {
    renderWithPndProviders(<AskPndChat />, { services: servicesWithAgentBuilder });

    expect(screen.queryByTestId('mockEmbeddableConversation')).not.toBeInTheDocument();
  });

  it('mounts the chat once the panel is opened', async () => {
    renderWithPndProviders(<AskPndChat />, { services: servicesWithAgentBuilder });

    fireEvent.click(screen.getByTestId('pndAskPndToggle'));

    expect(await screen.findByTestId('mockEmbeddableConversation')).toBeInTheDocument();
  });

  it('collapses the panel when the chat closes itself, rather than leaving the page', async () => {
    renderWithPndProviders(<AskPndChat />, { services: servicesWithAgentBuilder });

    fireEvent.click(screen.getByTestId('pndAskPndToggle'));
    fireEvent.click(await screen.findByTestId('mockEmbeddableConversationClose'));

    expect(screen.queryByTestId('mockEmbeddableConversation')).not.toBeInTheDocument();
  });

  it('says that PND conversations are already in the chat’s own picker', () => {
    renderWithPndProviders(<AskPndChat />, { services: servicesWithAgentBuilder });

    expect(screen.getByTestId('pndAskPndDescription')).toHaveTextContent(/picker/i);
  });

  it('explains itself instead of the chat when Agent Builder is not installed', () => {
    renderWithPndProviders(<AskPndChat />, { services: {} });

    expect(screen.getByTestId('pndAskPndUnavailable')).toBeInTheDocument();
  });

  it('renders no toggle when Agent Builder is not installed', () => {
    renderWithPndProviders(<AskPndChat />, { services: {} });

    expect(screen.queryByTestId('pndAskPndToggle')).not.toBeInTheDocument();
  });
});
