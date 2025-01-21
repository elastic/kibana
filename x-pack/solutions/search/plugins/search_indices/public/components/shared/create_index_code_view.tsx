/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { Languages, AvailableLanguages, LanguageOptions } from '../../code_examples';

import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { useKibana } from '../../hooks/use_kibana';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

import { APIKeyCallout } from './api_key_callout';
import { CodeSample } from './code_sample';
import { useWorkflow } from './hooks/use_workflow';
import { LanguageSelector } from './language_selector';
import { GuideSelector } from './guide_selector';
import { Workflow, WorkflowId } from '../../code_examples/workflows';

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
}

export const CreateIndexCodeView = ({
  analyticsEvents,
  canCreateApiKey,
  changeCodingLanguage,
  changeWorkflowId,
  selectedWorkflow,
  indexName,
  selectedLanguage,
}: CreateIndexCodeViewProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const usageTracker = useUsageTracker();
  const { createIndexExamples: selectedCodeExamples } = useWorkflow();

  const elasticsearchUrl = useElasticsearchUrl();
  const { apiKey } = useSearchApiKey();

  const codeParams = useMemo(() => {
    return {
      indexName: indexName || undefined,
      elasticsearchURL: elasticsearchUrl,
      apiKey: apiKey || undefined,
    };
  }, [indexName, elasticsearchUrl, apiKey]);
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
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <GuideSelector
              selectedWorkflowId={selectedWorkflow?.id || 'default'}
              onChange={changeWorkflowId}
              showTour={false}
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
      </EuiFlexItem>
      {!!selectedWorkflow && (
        <>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{selectedWorkflow?.title}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              <p>{selectedWorkflow?.summary}</p>
            </EuiText>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem css={{ maxWidth: '300px' }}>
        <LanguageSelector
          options={LanguageOptions}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={changeCodingLanguage}
        />
      </EuiFlexItem>
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
