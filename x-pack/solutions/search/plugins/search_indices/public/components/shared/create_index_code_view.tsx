/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { i18n } from '@kbn/i18n';
import { WorkflowId } from '@kbn/search-shared-ui';
import { Languages, AvailableLanguages, LanguageOptions } from '../../code_examples';

import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { useKibana } from '../../hooks/use_kibana';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

import { APIKeyCallout } from './api_key_callout';
import { CodeSample } from './code_sample';
import { LanguageSelector } from './language_selector';
import { GuideSelector } from './guide_selector';
import { Workflow } from '../../code_examples/workflows';
import { CreateIndexCodeExamples, CodeSnippetParameters } from '../../types';

export interface CreateIndexCodeViewProps {
  selectedLanguage: AvailableLanguages;
  indexName: string;
  changeCodingLanguage: (language: AvailableLanguages) => void;
  changeWorkflowId: (workflowId: WorkflowId) => void;
  selectedWorkflow?: Workflow;
  canCreateApiKey?: boolean;
  analyticsEvents: {
    runInConsole: string;
    installCommands: string;
    createIndex: string;
  };
  selectedCodeExamples: CreateIndexCodeExamples;
}

export const CreateIndexCodeView = ({
  analyticsEvents,
  canCreateApiKey,
  changeCodingLanguage,
  changeWorkflowId,
  selectedWorkflow,
  indexName,
  selectedLanguage,
  selectedCodeExamples,
}: CreateIndexCodeViewProps) => {
  const { application, share, cloud, console: consolePlugin } = useKibana().services;
  const usageTracker = useUsageTracker();

  const elasticsearchUrl = useElasticsearchUrl();
  const { apiKey } = useSearchApiKey();

  const codeParams: CodeSnippetParameters = useMemo(() => {
    return {
      indexName: indexName || undefined,
      elasticsearchURL: elasticsearchUrl,
      apiKey: apiKey || undefined,
      isServerless: cloud?.isServerlessEnabled ?? undefined,
    };
  }, [indexName, elasticsearchUrl, apiKey, cloud]);
  const selectedCodeExample = useMemo(() => {
    return selectedCodeExamples[selectedLanguage];
  }, [selectedLanguage, selectedCodeExamples]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="createIndexCodeView">
      {canCreateApiKey && (
        <EuiFlexItem grow={true}>
          <APIKeyCallout apiKey={apiKey} />
        </EuiFlexItem>
      )}
      <EuiHorizontalRule margin="none" />
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate('xpack.searchIndices.guideSelectors.selectGuideTitle', {
              defaultMessage: 'Select a workflow guide',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer />
        <GuideSelector
          selectedWorkflowId={selectedWorkflow?.id || 'default'}
          onChange={changeWorkflowId}
          showTour={false}
        />
      </EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} css={{ minWidth: '150px' }}>
          <LanguageSelector
            options={LanguageOptions}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={changeCodingLanguage}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TryInConsoleButton
            request={selectedCodeExamples.sense.createIndex(codeParams)}
            application={application}
            sharePlugin={share}
            consolePlugin={consolePlugin}
            telemetryId={`${selectedLanguage}_create_index`}
            onClick={() => {
              usageTracker.click([
                analyticsEvents.runInConsole,
                `${analyticsEvents.runInConsole}_${selectedLanguage}`,
              ]);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedCodeExample.installCommand && (
        <CodeSample
          title={selectedCodeExamples.installTitle}
          description={selectedCodeExamples.installDescription}
          language="shell"
          code={selectedCodeExample.installCommand}
          onCodeCopyClick={() => {
            usageTracker.click([
              analyticsEvents.installCommands,
              `${analyticsEvents.installCommands}_${selectedLanguage}`,
            ]);
          }}
        />
      )}
      <CodeSample
        id="createIndex"
        title={selectedCodeExamples.createIndexTitle}
        description={selectedCodeExamples.createIndexDescription}
        language={Languages[selectedLanguage].codeBlockLanguage}
        code={selectedCodeExample.createIndex(codeParams)}
        onCodeCopyClick={() => {
          usageTracker.click([
            analyticsEvents.createIndex,
            `${analyticsEvents.createIndex}_${selectedLanguage}`,
            `${analyticsEvents.createIndex}_${selectedLanguage}_${selectedCodeExamples.exampleType}`,
          ]);
        }}
      />
    </EuiFlexGroup>
  );
};
