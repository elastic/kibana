/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FooterAiActionsProps } from './footer_ai_actions';
import { FooterAiActions } from './footer_ai_actions';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { useAssistant } from '../hooks/use_assistant';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';

jest.mock('../../../../flyout/document_details/shared/hooks/use_event_details');
jest.mock('../hooks/use_assistant');
jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment');
// Mock leaf UI components with their known data-test-subj values
jest.mock('../../../../agent_builder/components/new_agent_builder_attachment', () => ({
  NewAgentBuilderAttachment: () => <div data-test-subj="newAgentBuilderAttachment" />,
}));
jest.mock('@kbn/elastic-assistant', () => ({
  NewChatByTitle: () => <div data-test-subj="newChatByTitle" />,
}));

const AGENT_BUTTON_TEST_ID = 'newAgentBuilderAttachment';
const CHAT_BUTTON_TEST_ID = 'newChatByTitle';

const createMockHit = (flattened: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-id', _index: 'test-index' },
    flattened,
  } as DataTableRecord);

const alertHit = createMockHit({ 'kibana.alert.rule.uuid': 'rule-uuid' });
const eventHit = createMockHit({ 'event.kind': 'event' });

const renderFooterAiActions = (props: FooterAiActionsProps) =>
  render(
    <IntlProvider locale="en">
      <FooterAiActions {...props} />
    </IntlProvider>
  );

describe('<FooterAiActions />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useEventDetails as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser: [],
      loading: false,
    });
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useAgentBuilderAttachment as jest.Mock).mockReturnValue({
      openAgentBuilderFlyout: jest.fn(),
    });
    (useAssistant as jest.Mock).mockReturnValue({
      showAssistant: false,
      showAssistantOverlay: jest.fn(),
      promptContextId: '',
    });
  });

  describe('loading state', () => {
    it('renders null while data is loading and no prop is provided', () => {
      (useEventDetails as jest.Mock).mockReturnValue({
        dataFormattedForFieldBrowser: null,
        loading: true,
      });

      const { container } = renderFooterAiActions({ hit: alertHit });

      expect(container).toBeEmptyDOMElement();
    });

    it('does not return null while loading when dataFormattedForFieldBrowser prop is provided', () => {
      (useEventDetails as jest.Mock).mockReturnValue({
        dataFormattedForFieldBrowser: null,
        loading: true,
      });
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { getByTestId } = renderFooterAiActions({
        hit: alertHit,
        dataFormattedForFieldBrowser: [],
      });

      expect(getByTestId(CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('fetch behaviour', () => {
    it('skips the internal fetch when dataFormattedForFieldBrowser prop is provided', () => {
      renderFooterAiActions({ hit: alertHit, dataFormattedForFieldBrowser: [] });

      expect(useEventDetails).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    });

    it('performs the internal fetch when dataFormattedForFieldBrowser prop is not provided', () => {
      renderFooterAiActions({ hit: alertHit });

      expect(useEventDetails).toHaveBeenCalledWith(expect.objectContaining({ skip: false }));
    });

    it('passes hit _id and _index to useEventDetails', () => {
      renderFooterAiActions({ hit: alertHit });

      expect(useEventDetails).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 'test-id', indexName: 'test-index' })
      );
    });
  });

  describe('agent builder button', () => {
    it('renders the agent builder button when isAgentChatExperienceEnabled is true', () => {
      (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
        isAgentChatExperienceEnabled: true,
      });

      const { getByTestId } = renderFooterAiActions({ hit: alertHit });

      expect(getByTestId(AGENT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('does not render the assistant button when agent builder is enabled', () => {
      (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
        isAgentChatExperienceEnabled: true,
      });
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { queryByTestId } = renderFooterAiActions({ hit: alertHit });

      expect(queryByTestId(CHAT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('assistant button', () => {
    it('renders the assistant button when showAssistant is true and agent builder is disabled', () => {
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { getByTestId } = renderFooterAiActions({ hit: alertHit });

      expect(getByTestId(CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('does not render the agent builder button when only the assistant is shown', () => {
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { queryByTestId } = renderFooterAiActions({ hit: alertHit });

      expect(queryByTestId(AGENT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('neither feature available', () => {
    it('renders null when agent builder is disabled and showAssistant is false', () => {
      const { container } = renderFooterAiActions({ hit: alertHit });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('alert vs event', () => {
    it('renders for an alert hit', () => {
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { getByTestId } = renderFooterAiActions({ hit: alertHit });

      expect(getByTestId(CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('renders for an event hit', () => {
      (useAssistant as jest.Mock).mockReturnValue({
        showAssistant: true,
        showAssistantOverlay: jest.fn(),
        promptContextId: '123',
      });

      const { getByTestId } = renderFooterAiActions({ hit: eventHit });

      expect(getByTestId(CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
    });
  });
});
