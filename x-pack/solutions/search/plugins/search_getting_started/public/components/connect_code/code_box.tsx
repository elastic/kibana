/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { useSearchApiKey } from '@kbn/search-api-keys-components';
import {
  type AvailableLanguages,
  GettingStartedCodeExample,
} from '@kbn/search-code-examples/src/getting-started-tutorials';
import type { CodeSnippetParameters } from '@kbn/search-code-examples/src/getting-started-tutorials/types';
import { useKibana } from '../../hooks/use_kibana';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { API_KEY_PLACEHOLDER } from '../../constants';

interface Props {
  selectedLanguage: AvailableLanguages;
  codeBlockLanguage: string;
}

export const CodeBox = ({ selectedLanguage, codeBlockLanguage }: Props) => {
  const { cloud } = useKibana().services;
  const elasticsearchUrl = useElasticsearchUrl();
  const { apiKey } = useSearchApiKey();
  const selectedExample = GettingStartedCodeExample[selectedLanguage];

  const codeParams: CodeSnippetParameters = useMemo(() => {
    return {
      elasticsearchURL: elasticsearchUrl,
      apiKey: apiKey || API_KEY_PLACEHOLDER,
      isServerless: cloud?.isServerlessEnabled ?? undefined,
    };
  }, [elasticsearchUrl, apiKey, cloud]);

  const codeExample = useMemo(() => {
    return selectedExample.gettingStartedSemantic({
      ...codeParams,
      sampleDocuments: GettingStartedCodeExample.sampleDocs,
      queryObject: GettingStartedCodeExample.queryObject,
    });
  }, [selectedExample, codeParams]);

  return (
    <EuiCodeBlock isCopyable fontSize="m" language={codeBlockLanguage} overflowHeight={700}>
      {codeExample}
    </EuiCodeBlock>
  );
};
