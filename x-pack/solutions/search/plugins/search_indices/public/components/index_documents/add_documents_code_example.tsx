/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { MappingDenseVectorProperty, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { isEqual } from 'lodash';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { useKibana } from '../../hooks/use_kibana';
import { IngestCodeSnippetParameters } from '../../types';
import { LanguageSelector } from '../shared/language_selector';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AvailableLanguages, LanguageOptions, Languages } from '../../code_examples';
import { AnalyticsEvents } from '../../analytics/constants';
import { CodeSample } from '../shared/code_sample';
import { generateSampleDocument } from '../../utils/document_generation';
import { getDefaultCodingLanguage } from '../../utils/language';
import { GuideSelector } from '../shared/guide_selector';
import { useWorkflow } from '../shared/hooks/use_workflow';
import { WorkflowId } from '../../code_examples/workflows';

export const basicExampleTexts = [
  'Yellowstone National Park',
  'Yosemite National Park',
  'Rocky Mountain National Park',
];
export const exampleTextsWithCustomMapping = [1, 2, 3].map((num) => `Example text ${num}`);

export interface AddDocumentsCodeExampleProps {
  indexName: string;
  mappingProperties: Record<string, MappingProperty>;
}

export const AddDocumentsCodeExample = ({
  indexName,
  mappingProperties,
}: AddDocumentsCodeExampleProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const elasticsearchUrl = useElasticsearchUrl();
  const usageTracker = useUsageTracker();
  const indexHasMappings = Object.keys(mappingProperties).length > 0;

  const [selectedLanguage, setSelectedLanguage] =
    useState<AvailableLanguages>(getDefaultCodingLanguage);
  const { selectedWorkflowId, setSelectedWorkflowId, ingestExamples, workflow } = useWorkflow();
  const selectedCodeExamples = ingestExamples[selectedLanguage];
  const codeSampleMappings = indexHasMappings ? mappingProperties : ingestExamples.defaultMapping;
  const onSelectLanguage = useCallback(
    (value: AvailableLanguages) => {
      setSelectedLanguage(value);
      usageTracker.count([
        AnalyticsEvents.indexDetailsCodeLanguageSelect,
        `${AnalyticsEvents.indexDetailsCodeLanguageSelect}_${value}`,
      ]);
    },
    [usageTracker]
  );
  const sampleDocuments = useMemo(() => {
    // If the default mapping was used, we need to exclude generated vector fields
    const copyCodeSampleMappings = {
      ...codeSampleMappings,
      vector: {
        type: codeSampleMappings.vector?.type,
        dims: (codeSampleMappings.vector as MappingDenseVectorProperty)?.dims,
      },
    };
    const isDefaultMapping = isEqual(copyCodeSampleMappings, ingestExamples.defaultMapping);
    const sampleTexts = isDefaultMapping ? basicExampleTexts : exampleTextsWithCustomMapping;

    return sampleTexts.map((text) => generateSampleDocument(codeSampleMappings, text));
  }, [codeSampleMappings, ingestExamples.defaultMapping]);
  const { apiKey } = useSearchApiKey();
  const codeParams: IngestCodeSnippetParameters = useMemo(() => {
    return {
      indexName,
      elasticsearchURL: elasticsearchUrl,
      sampleDocuments,
      indexHasMappings,
      mappingProperties: codeSampleMappings,
      apiKey: apiKey || undefined,
    };
  }, [indexName, elasticsearchUrl, sampleDocuments, codeSampleMappings, indexHasMappings, apiKey]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="SearchIndicesAddDocumentsCode"
    >
      <EuiFlexGroup direction="column">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          {!indexHasMappings && (
            <EuiFlexItem css={{ maxWidth: '300px' }} grow={false}>
              <GuideSelector
                selectedWorkflowId={selectedWorkflowId}
                onChange={(workflowId: WorkflowId) => {
                  setSelectedWorkflowId(workflowId);
                  usageTracker.click([
                    AnalyticsEvents.indexDetailsCodeLanguageSelect,
                    `${AnalyticsEvents.indexDetailsCodeLanguageSelect}_${workflowId}`,
                  ]);
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TryInConsoleButton
              request={
                !indexHasMappings
                  ? `${ingestExamples.sense.updateMappingsCommand(
                      codeParams
                    )}\n\n${ingestExamples.sense.ingestCommand(codeParams)}`
                  : ingestExamples.sense.ingestCommand(codeParams)
              }
              application={application}
              sharePlugin={share}
              consolePlugin={consolePlugin}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {!!workflow && (
          <EuiFlexItem>
            <EuiTitle>
              <h3>{workflow.title}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText>
              <p>{workflow.summary}</p>
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem css={{ maxWidth: '300px' }} grow={false}>
          <LanguageSelector
            options={LanguageOptions}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={onSelectLanguage}
            showLabel
          />
        </EuiFlexItem>
        {selectedCodeExamples.installCommand && (
          <EuiFlexItem>
            <CodeSample
              id="installCodeExample"
              title={ingestExamples.installTitle}
              description={ingestExamples.installDescription}
              language="shell"
              code={selectedCodeExamples.installCommand}
              onCodeCopyClick={() => {
                usageTracker.click([
                  AnalyticsEvents.indexDetailsInstallCodeCopy,
                  `${AnalyticsEvents.indexDetailsInstallCodeCopy}_${selectedLanguage}`,
                ]);
              }}
            />
          </EuiFlexItem>
        )}
        {!indexHasMappings && (
          <EuiFlexItem>
            <CodeSample
              id="addMappingsCodeExample"
              title={ingestExamples.addMappingsTitle}
              description={ingestExamples.addMappingsDescription}
              language={Languages[selectedLanguage].codeBlockLanguage}
              code={selectedCodeExamples.updateMappingsCommand(codeParams)}
              onCodeCopyClick={() => {
                usageTracker.click([
                  AnalyticsEvents.indexDetailsAddMappingsCodeCopy,
                  `${AnalyticsEvents.indexDetailsAddMappingsCodeCopy}_${selectedLanguage}`,
                ]);
              }}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <CodeSample
            id="ingestDataCodeExample"
            title={i18n.translate('xpack.searchIndices.indexDetails.ingestDocuments.title', {
              defaultMessage: 'Ingest documents',
            })}
            description={i18n.translate(
              'xpack.searchIndices.indexDetails.ingestDocuments.description',
              {
                defaultMessage:
                  'Next, use the Elasticsearch bulk API to ingest an array of documents into the index.',
              }
            )}
            language={Languages[selectedLanguage].codeBlockLanguage}
            code={selectedCodeExamples.ingestCommand(codeParams)}
            onCodeCopyClick={() => {
              usageTracker.click([
                AnalyticsEvents.indexDetailsIngestDocumentsCodeCopy,
                `${AnalyticsEvents.indexDetailsIngestDocumentsCodeCopy}_${selectedLanguage}`,
              ]);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
