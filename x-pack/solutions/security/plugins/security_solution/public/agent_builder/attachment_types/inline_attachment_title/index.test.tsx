/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { INLINE_ATTACHMENT_TITLE_TEST_ID, InlineAttachmentTitle } from '.';

describe('InlineAttachmentTitle', () => {
  it('renders the title', () => {
    render(<InlineAttachmentTitle title="Lateral movement" />);

    expect(screen.getByTestId(INLINE_ATTACHMENT_TITLE_TEST_ID)).toHaveTextContent(
      'Lateral movement'
    );
  });

  it('renders the subtitle when provided', () => {
    render(<InlineAttachmentTitle subtitle="Analysis" title="Verdict" />);

    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('renders each badge', () => {
    render(
      <InlineAttachmentTitle
        badges={[{ color: 'danger', label: 'True positive' }, { label: 'Reviewed' }]}
        title="Verdict"
      />
    );

    expect(screen.getByText('True positive')).toBeInTheDocument();
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
  });

  it('renders badges that share a label without a duplicate key warning', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <InlineAttachmentTitle badges={[{ label: 'Same' }, { label: 'Same' }]} title="Verdict" />
    );

    expect(screen.getAllByText('Same')).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('uses the default test id', () => {
    render(<InlineAttachmentTitle title="Attack" />);

    expect(screen.getByTestId(INLINE_ATTACHMENT_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('uses the provided test id', () => {
    render(<InlineAttachmentTitle data-test-subj="customTitle" title="Attack" />);

    expect(screen.getByTestId('customTitle')).toHaveTextContent('Attack');
  });

  it('renders the icon when provided', () => {
    const { container } = render(<InlineAttachmentTitle icon="sparkles" title="Attack" />);

    expect(container.querySelector('[data-euiicon-type="sparkles"]')).not.toBeNull();
  });

  it('renders no icon when none is provided', () => {
    const { container } = render(<InlineAttachmentTitle title="Attack" />);

    expect(container.querySelector('[data-euiicon-type]')).toBeNull();
  });
});
