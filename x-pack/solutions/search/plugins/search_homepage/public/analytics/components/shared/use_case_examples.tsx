/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiAccordion, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import type { AnalyticsLinks, AnalyticsSampleData, AnalyticsStarterQuery } from '../../types';
import { getAnalyticsUseCases } from '../../use_cases';
import { IllustrativeIndexNote } from './illustrative_index_note';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { StarterQueryList } from './starter_query_list';
import { UseCaseTiles } from './use_case_tiles';

interface UseCaseExamplesProps {
  page: AnalyticsPageId;
  links: Pick<AnalyticsLinks, 'canUseDiscover' | 'openDiscover'>;
  sampleData: AnalyticsSampleData;
}

/** Example queries per use case, collapsed until the user asks for them. */
export const UseCaseExamples = ({
  page,
  links,
  sampleData,
}: UseCaseExamplesProps): React.JSX.Element => {
  const accordionId = useGeneratedHtmlId({ prefix: 'analyticsUseCaseExamples' });
  const [isOpen, setIsOpen] = useState(false);
  const { selectedUseCaseId, selectUseCase } = useAnalyticsPreferences();
  const useCases = useMemo(() => getAnalyticsUseCases(), []);
  const selectedUseCase = useCases.find(({ id }) => id === selectedUseCaseId);
  const sampleDataset = selectedUseCase?.sampleDataset;

  // A failed install is reported by the sample data hook.
  const onOpenSampleQuery = async ({ esql }: AnalyticsStarterQuery): Promise<void> => {
    if (sampleDataset === undefined) {
      return;
    }
    const isInstalled = await sampleData.install(sampleDataset);
    if (isInstalled) {
      links.openDiscover(esql);
    }
  };

  return (
    <EuiAccordion
      id={accordionId}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      buttonContent={i18n.translate('xpack.searchHomepage.analytics.useCaseExamples.title', {
        defaultMessage: 'Example queries by use case',
      })}
      buttonProps={{ 'data-test-subj': getPageTestSubj(page, 'UseCaseExamplesToggle') }}
      paddingSize="m"
      data-test-subj={getPageTestSubj(page, 'UseCaseExamples')}
      data-telemetry-id={getPageTelemetryId(page, 'useCaseExamples')}
    >
      {isOpen && (
        <>
          <UseCaseTiles
            page={page}
            useCases={useCases}
            selectedUseCaseId={selectedUseCase?.id}
            onSelectUseCase={selectUseCase}
          />
          {selectedUseCase && (
            <>
              <EuiSpacer size="m" />
              {sampleDataset === undefined ? (
                <>
                  <IllustrativeIndexNote page={page} indexPattern={selectedUseCase.indexPattern} />
                  <EuiSpacer size="m" />
                </>
              ) : (
                <>
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.searchHomepage.analytics.useCaseExamples.sampleDataNote',
                        {
                          defaultMessage:
                            'These queries run on sample events, which are installed the first time you open one.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="s" />
                </>
              )}
              <StarterQueryList
                key={selectedUseCase.id}
                page={page}
                queries={selectedUseCase.starterQueries}
                canUseDiscover={links.canUseDiscover}
                onOpenQuery={sampleDataset === undefined ? undefined : onOpenSampleQuery}
              />
            </>
          )}
        </>
      )}
    </EuiAccordion>
  );
};
