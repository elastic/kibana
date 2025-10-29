/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  type AvailableLanguages,
  LanguageOptions,
  Languages,
} from '@kbn/search-code-examples/src/getting-started-tutorials';

import { LanguageSelector } from './language_selector';
import { InstallCommandCodeBox } from './install_command_code_box';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { CodeBox } from './code_box';

export const SearchGettingStartedConnectCode = () => {
  const { euiTheme } = useEuiTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<AvailableLanguages>('python');

  const codeBlockLanguage = Languages[selectedLanguage].codeBlockLanguage;

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <SearchGettingStartedSectionHeading
          icon="plugs"
          title={i18n.translate('xpack.search.gettingStarted.page.codeExample.title', {
            defaultMessage: 'Connect to your application',
          })}
          description={i18n.translate('xpack.search.gettingStarted.page.codeExample.description', {
            defaultMessage: 'Choose a language client and connect your application.',
          })}
        />

        <EuiFlexItem
          grow={false}
          css={css`
            width: calc(${euiTheme.size.xxxxl} * 6);
          `}
        >
          <LanguageSelector
            options={LanguageOptions}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <InstallCommandCodeBox selectedLanguage={selectedLanguage} />
      <EuiSpacer size="m" />
      <CodeBox selectedLanguage={selectedLanguage} codeBlockLanguage={codeBlockLanguage} />
    </>
  );
};
