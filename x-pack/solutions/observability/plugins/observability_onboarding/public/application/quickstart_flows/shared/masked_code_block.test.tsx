/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderWithHostPageProviders } from '../../pages/host/__tests__/test_helpers';
import { MaskedCodeBlock, maskSecretValues } from './masked_code_block';

jest.mock('./copy_to_clipboard_button', () => ({
  CopyToClipboardButton: ({
    textToCopy,
    'data-test-subj': dataTestSubj,
  }: {
    textToCopy: string;
    'data-test-subj'?: string;
  }) => <button data-test-subj={dataTestSubj} data-text-to-copy={textToCopy} />,
}));

describe('MaskedCodeBlock', () => {
  it('masks secret values in displayed snippets', () => {
    const snippet = "curl -H 'Authorization: ApiKey real-api-key' https://elastic.example";

    expect(maskSecretValues(snippet, ['real-api-key', 'https://elastic.example'])).toBe(
      "curl -H 'Authorization: ApiKey ********' ********"
    );
  });

  it('masks longer overlapping secrets first', () => {
    expect(maskSecretValues('token-abc token', ['token', 'token-abc'])).toBe('******** ********');
  });

  it('hides secrets by default while copying the unmasked snippet', async () => {
    const snippet = "kubectl create secret --from-literal=api_key='real-api-key'";

    renderWithHostPageProviders(
      <MaskedCodeBlock
        value={snippet}
        secrets={['real-api-key']}
        language="bash"
        dataTestSubj="testMaskedSnippet"
      />
    );

    expect(screen.getByTestId('testMaskedSnippet')).toHaveTextContent(
      "kubectl create secret --from-literal=api_key='********'"
    );
    expect(screen.queryByText(/real-api-key/)).not.toBeInTheDocument();
    expect(screen.getByTestId('testMaskedSnippetCopyButton')).toHaveAttribute(
      'data-text-to-copy',
      snippet
    );

    await userEvent.click(screen.getByTestId('testMaskedSnippetShowSecretsSwitch'));

    expect(screen.getByTestId('testMaskedSnippet')).toHaveTextContent(snippet);
  });
});
