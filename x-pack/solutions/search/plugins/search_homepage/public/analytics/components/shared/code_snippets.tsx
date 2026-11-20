/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CodeSnippet, SnippetLanguage } from '../../query_snippets';

const LANGUAGE_LABELS: Record<SnippetLanguage, string> = {
  curl: i18n.translate('xpack.searchHomepage.analytics.codeSnippets.curl', {
    defaultMessage: 'cURL',
  }),
  javascript: i18n.translate('xpack.searchHomepage.analytics.codeSnippets.javascript', {
    defaultMessage: 'JavaScript',
  }),
  python: i18n.translate('xpack.searchHomepage.analytics.codeSnippets.python', {
    defaultMessage: 'Python',
  }),
};

interface CodeSnippetsProps {
  snippets: readonly CodeSnippet[];
  /** Prefix of the test subjects and telemetry ids of the language switch and the code. */
  idPrefix: string;
}

/** One request written in several languages: a language switch over a code block that can be copied. */
export const CodeSnippets = ({ snippets, idPrefix }: CodeSnippetsProps): React.JSX.Element => {
  const [selectedLanguage, setSelectedLanguage] = useState<SnippetLanguage>();
  const selected = snippets.find(({ language }) => language === selectedLanguage) ?? snippets[0];

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.searchHomepage.analytics.codeSnippets.languageLegend', {
          defaultMessage: 'Language',
        })}
        buttonSize="compressed"
        idSelected={`${idPrefix}Language-${selected.language}`}
        onChange={(_, language: SnippetLanguage) => setSelectedLanguage(language)}
        options={snippets.map(({ language }) => ({
          id: `${idPrefix}Language-${language}`,
          value: language,
          label: LANGUAGE_LABELS[language],
          'data-test-subj': `${idPrefix}Language-${language}`,
          'data-telemetry-id': `${idPrefix}-language-${language}`,
        }))}
      />
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language={selected.codeBlockLanguage}
        fontSize="s"
        paddingSize="m"
        isCopyable
        data-test-subj={`${idPrefix}Code`}
      >
        {selected.code}
      </EuiCodeBlock>
    </>
  );
};
