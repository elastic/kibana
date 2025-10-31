/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UpdateFieldInFormButton, hasSuggestedAllowedField } from '.';

const mockCodeBlockRefCallback = jest.fn();
const mockUseAssistantContext = {
  codeBlockRef: {
    current: {
      'Detection Rules Create form - AI Assisted rule creation - [queryBar]':
        mockCodeBlockRefCallback,
      'Detection Rules Create form - AI Assisted rule creation - [name]': mockCodeBlockRefCallback,
      'Detection Rules Create form - AI Assisted rule creation - [description]':
        mockCodeBlockRefCallback,
    },
  },
};

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => mockUseAssistantContext,
}));

describe('UpdateFieldInFormButton', () => {
  const defaultProps = {
    query: 'from auditbeat* | limit 10',
    title: 'Detection Rules Create form - AI Assisted rule creation - [queryBar]',
    messageContent:
      'Here is a new suggested rule field [queryBar] value: from auditbeat* | limit 10',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the button with correct attributes', () => {
      render(<UpdateFieldInFormButton {...defaultProps} />);

      const button = screen.getByTestId('update-field-in-form-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Update field in form');
    });
  });

  describe('click handler', () => {
    it('calls codeBlockRef callback with correct parameters for queryBar field', async () => {
      const user = userEvent.setup();
      render(<UpdateFieldInFormButton {...defaultProps} />);

      await user.click(screen.getByTestId('update-field-in-form-button'));

      expect(mockCodeBlockRefCallback).toHaveBeenCalledWith(
        'from auditbeat* | limit 10',
        'queryBar'
      );
    });

    it('calls codeBlockRef callback with correct parameters for name field', async () => {
      const user = userEvent.setup();
      const props = {
        title: 'Detection Rules Create form - AI Assisted rule creation - [name]',
        messageContent:
          'Here is a new suggested rule field [name] value: Suspicious Process Activity',
        query: 'Suspicious Process Activity',
      };

      render(<UpdateFieldInFormButton {...props} />);

      await user.click(screen.getByTestId('update-field-in-form-button'));

      expect(mockCodeBlockRefCallback).toHaveBeenCalledWith('Suspicious Process Activity', 'name');
    });

    it('calls codeBlockRef callback with correct parameters for description field', async () => {
      const user = userEvent.setup();
      const props = {
        title: 'Detection Rules Create form - AI Assisted rule creation - [description]',
        messageContent:
          'Here is a new suggested rule field [description] value: This rule detects suspicious activity',
        query: 'This rule detects suspicious activity',
      };

      render(<UpdateFieldInFormButton {...props} />);

      await user.click(screen.getByTestId('update-field-in-form-button'));

      expect(mockCodeBlockRefCallback).toHaveBeenCalledWith(
        'This rule detects suspicious activity',
        'description'
      );
    });

    it('handles case when no field name is found in message content', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        messageContent: 'Some message without the expected pattern',
      };

      render(<UpdateFieldInFormButton {...props} />);

      await user.click(screen.getByTestId('update-field-in-form-button'));

      expect(mockCodeBlockRefCallback).toHaveBeenCalledWith('from auditbeat* | limit 10', null);
    });
  });

  describe('field name extraction', () => {
    it('handles case-insensitive pattern matching', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        messageContent: 'Here is A NEW SUGGESTED RULE FIELD [queryBar] value: test',
      };

      render(<UpdateFieldInFormButton {...props} />);

      await user.click(screen.getByTestId('update-field-in-form-button'));

      expect(mockCodeBlockRefCallback).toHaveBeenCalledWith(
        'from auditbeat* | limit 10',
        'queryBar'
      );
    });
  });
});

describe('hasSuggestedAllowedField utility function', () => {
  it('returns true for allowed field suggestions with queryBar title', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [queryBar]';
    const messageContent = 'Here is a new suggested rule field [queryBar] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(true);
  });

  it('returns true for allowed field suggestions with name title', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [name]';
    const messageContent = 'Here is a new suggested rule field [name] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(true);
  });

  it('returns true for cross-field suggestions (description suggested for name field)', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [name]';
    const messageContent = 'Here is a new suggested rule field [description] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(true);
  });

  it('returns false for non-allowed field suggestions', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [queryBar]';
    const messageContent = 'Here is a new suggested rule field [invalidField] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(false);
  });

  it('returns false when title has no field name', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation';
    const messageContent = 'Here is a new suggested rule field [name] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(false);
  });

  it('returns false when message does not contain suggestion pattern', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [name]';
    const messageContent = 'Some random message without the pattern';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(false);
  });

  it('handles case-insensitive matching', () => {
    const title = 'Detection Rules Create form - AI Assisted rule creation - [name]';
    const messageContent = 'Here is a new suggested rule field [NAME] value: test';

    expect(hasSuggestedAllowedField(messageContent, title)).toBe(true);
  });
});
