/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  CodeBox,
  getConsoleRequest,
  getLanguageDefinitionCodeSnippet,
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';

import { KibanaDeps } from '../../../../../common/types';

import { languageDefinitions } from '../languages/languages';

interface TestConnectionPanelContentProps {
  assetBasePath: string;
  codeArgs: LanguageDefinitionSnippetArguments;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (selectedLanguage: LanguageDefinition) => void;
}

export const TestConnectionPanelContent: React.FC<TestConnectionPanelContentProps> = ({
  assetBasePath,
  codeArgs,
  selectedLanguage,
  setSelectedLanguage,
}) => {
  const { services } = useKibana<KibanaDeps>();
  return (
    <CodeBox
      languages={languageDefinitions}
      codeSnippet={getLanguageDefinitionCodeSnippet(selectedLanguage, 'testConnection', codeArgs)}
      consoleRequest={getConsoleRequest('testConnection')}
      selectedLanguage={selectedLanguage}
      setSelectedLanguage={setSelectedLanguage}
      assetBasePath={assetBasePath}
      application={services.application}
      sharePlugin={services.share}
    />
  );
};
