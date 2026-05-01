/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { useKibana } from '../services';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language, type SnippetSet } from './languages';
import { fillPlaceholders } from './snippets';
import { useOnboardingCredentials } from './use_onboarding_credentials';

interface ApiStepProps {
  snippets: SnippetSet;
  consoleRequest: string;
  prompt?: string;
}

export const ApiStep: React.FC<ApiStepProps> = ({ snippets, consoleRequest, prompt }) => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();
  const { elasticsearchUrl, apiKey } = useOnboardingCredentials();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const syntax = LANGUAGES.find((l) => l.id === language)?.syntax ?? 'python';
  const renderedSnippet = fillPlaceholders(
    snippets[language],
    elasticsearchUrl ?? undefined,
    apiKey ?? undefined
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiSelect
            compressed
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            options={LANGUAGES.map((l) => ({ value: l.id, text: l.label }))}
            aria-label={i18n.translate('vectordbOnboarding.wizard.languagePickerLegend', {
              defaultMessage: 'Programming language',
            })}
            data-test-subj="vectordbWizardLanguagePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiCodeBlock
        language={syntax}
        fontSize="m"
        paddingSize="m"
        isCopyable
        overflowHeight={420}
        data-test-subj="vectordbWizardSnippet"
      >
        {renderedSnippet}
      </EuiCodeBlock>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <TryInConsoleButton
            request={consoleRequest}
            application={application}
            consolePlugin={consolePlugin}
            sharePlugin={share}
            type="button"
            data-test-subj="vectordbWizardTryInConsole"
          />
        </EuiFlexItem>
        {prompt ? (
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={prompt}>
              {(copy) => (
                <EuiButtonEmpty
                  iconType="copyClipboard"
                  size="s"
                  onClick={copy}
                  data-test-subj="vectordbWizardCopyPrompt"
                >
                  {i18n.translate('vectordbOnboarding.wizard.copyPrompt', {
                    defaultMessage: 'Copy prompt',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
