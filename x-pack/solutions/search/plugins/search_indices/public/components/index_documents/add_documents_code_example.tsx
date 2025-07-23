/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { WorkflowId } from '@kbn/search-shared-ui';
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

export const exampleTexts = [
  'Yellowstone National Park is one of the largest national parks in the United States. It ranges from the Wyoming to Montana and Idaho, and contains an area of 2,219,791 acress across three different states. Its most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened. Most notably, it contains free-ranging herds of bison and elk, alongside bears, cougars and wolves. The national park receives over 4.5 million visitors annually and is a UNESCO World Heritage Site.',
  'Yosemite National Park is a United States National Park, covering over 750,000 acres of land in California. A UNESCO World Heritage Site, the park is best known for its granite cliffs, waterfalls and giant sequoia trees. Yosemite hosts over four million visitors in most years, with a peak of five million visitors in 2016. The park is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep. The park has 1,200 square miles of wilderness, and is a popular destination for rock climbers, with over 3,000 feet of vertical granite to climb. Its most famous and cliff is the El Capitan, a 3,000 feet monolith along its tallest face.',
  'Rocky Mountain National Park  is one of the most popular national parks in the United States. It receives over 4.5 million visitors annually, and is known for its mountainous terrain, including Longs Peak, which is the highest peak in the park. The park is home to a variety of wildlife, including elk, mule deer, moose, and bighorn sheep. The park is also home to a variety of ecosystems, including montane, subalpine, and alpine tundra. The park is a popular destination for hiking, camping, and wildlife viewing, and is a UNESCO World Heritage Site.',
];

export interface AddDocumentsCodeExampleProps {
  indexName: string;
  mappingProperties: Record<string, MappingProperty>;
}

export const AddDocumentsCodeExample = ({
  indexName,
  mappingProperties,
}: AddDocumentsCodeExampleProps) => {
  const { application, share, console: consolePlugin, cloud } = useKibana().services;
  const elasticsearchUrl = useElasticsearchUrl();
  const usageTracker = useUsageTracker();
  const indexHasMappings = Object.keys(mappingProperties).length > 0;

  const [selectedLanguage, setSelectedLanguage] =
    useState<AvailableLanguages>(getDefaultCodingLanguage);
  const { selectedWorkflowId, setSelectedWorkflowId, ingestExamples } = useWorkflow();
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
    return exampleTexts.map((text) => generateSampleDocument(codeSampleMappings, text));
  }, [codeSampleMappings]);
  const { apiKey } = useSearchApiKey();

  const codeParams: IngestCodeSnippetParameters = useMemo(() => {
    return {
      indexName,
      elasticsearchURL: elasticsearchUrl,
      sampleDocuments,
      indexHasMappings,
      mappingProperties: codeSampleMappings,
      apiKey: apiKey || undefined,
      isServerless: cloud?.isServerlessEnabled ?? undefined,
    };
  }, [
    indexName,
    elasticsearchUrl,
    sampleDocuments,
    codeSampleMappings,
    indexHasMappings,
    apiKey,
    cloud,
  ]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="SearchIndicesAddDocumentsCode"
    >
      <EuiFlexGroup direction="column">
        {!indexHasMappings && (
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>
                {i18n.translate('xpack.searchIndices.guideSelectors.selectGuideTitle', {
                  defaultMessage: 'Select a workflow guide',
                })}
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        )}
        {!indexHasMappings && (
          <EuiFlexItem grow={false}>
            <GuideSelector
              selectedWorkflowId={selectedWorkflowId}
              onChange={(workflowId: WorkflowId) => {
                setSelectedWorkflowId(workflowId);
                usageTracker.click([
                  AnalyticsEvents.indexDetailsWorkflowSelect,
                  `${AnalyticsEvents.indexDetailsWorkflowSelect}_${workflowId}`,
                ]);
              }}
              showTour
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
            <EuiFlexItem css={{ maxWidth: '300px' }} grow={false}>
              <LanguageSelector
                options={LanguageOptions}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={onSelectLanguage}
                showLabel
              />
            </EuiFlexItem>
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
