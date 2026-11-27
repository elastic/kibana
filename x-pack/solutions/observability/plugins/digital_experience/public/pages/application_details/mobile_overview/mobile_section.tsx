/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { ChartArea } from '../../../components/chart_area';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { MOBILE_APPLICATION_EBT_ELEMENTS } from '../../../ebt_constants';
import { CHART_HEIGHT } from './chart_panel';

/** What a section of the Overview loads: its response, `undefined` while it loads. */
export interface MobileSectionState<TResponse> {
  response: TResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/**
 * A section of a mobile application's Overview, titled, with its own states: an error with a retry,
 * then a loading chart, then a message without data, then its content.
 */
export function MobileSection<TResponse>({
  title,
  state: { response, isLoading, error, refresh },
  isEmpty,
  emptyMessage,
  loadErrorTitle,
  loadingLabel,
  'data-test-subj': dataTestSubj,
  testSubjPrefix,
  children,
}: {
  title: string;
  state: MobileSectionState<TResponse>;
  isEmpty: (response: TResponse) => boolean;
  emptyMessage: string;
  loadErrorTitle: string;
  loadingLabel: string;
  'data-test-subj': string;
  /** Of the section's states, e.g. `…Loading` and `…Error`. */
  testSubjPrefix: string;
  children: (response: TResponse) => ReactNode;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'mobileSectionTitle' });

  const body = (): ReactNode => {
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj={`${testSubjPrefix}Error`}
          retryDataTestSubj={`${testSubjPrefix}Retry`}
          retryEbtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RETRY}
          title={loadErrorTitle}
          error={error}
          onRetry={refresh}
          headingLevel="h3"
        />
      );
    }
    const isPending = isLoading || !response;
    if (isPending || isEmpty(response)) {
      return (
        <ChartArea
          height={CHART_HEIGHT}
          isLoading={isPending}
          hasData={false}
          emptyMessage={emptyMessage}
          loadingLabel={loadingLabel}
          data-test-subj={`${testSubjPrefix}${isPending ? 'Loading' : 'Empty'}`}
        >
          {null}
        </ChartArea>
      );
    }
    return children(response);
  };

  return (
    <section aria-labelledby={titleId} data-test-subj={dataTestSubj}>
      <EuiTitle size="s">
        <h2 id={titleId}>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {body()}
    </section>
  );
}
