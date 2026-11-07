/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFormErrorText, EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { fromKueryExpression } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../../../../common/feature';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../../../common/otel_data';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useOverviewKuery } from '../../../../hooks/use_overview_search';

type OnQuerySubmit = NonNullable<StatefulSearchBarProps['onQuerySubmit']>;

type AdHocDataView = Awaited<ReturnType<DataPublicPluginStart['dataViews']['create']>>;

/** The data of the Overview: the EDOT Browser logs and traces, which the KQL query reads. */
const OTEL_INDEX_PATTERN = `${OTEL_LOGS_INDEX},${OTEL_TRACES_INDEX}`;

const PLACEHOLDER = i18n.translate('xpack.digitalExperience.overview.kuery.placeholder', {
  defaultMessage: 'Filter by any field, e.g. user_agent.name : "Chrome"',
});

const kueryErrorOf = (kuery: string): string | undefined => {
  try {
    fromKueryExpression(kuery);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/**
 * The Overview's KQL bar, rendered by Unified Search so it follows Kibana's settings; the date
 * picker is a control of its own. The bar suggests the fields and values of the OTel indices
 * through an ad hoc data view, which is never saved; without one, e.g. before the first data
 * arrives, it still takes KQL.
 */
export function OverviewSearchBar({ onRefresh }: { onRefresh: () => void }) {
  const { euiTheme } = useEuiTheme();
  const { unifiedSearch, data } = useKibanaServices();
  const { kuery, setKuery } = useOverviewKuery();
  const [kueryError, setKueryError] = useState<string>();
  const [dataViewState, setDataViewState] = useState<{ dataView?: AdHocDataView }>();

  useEffect(() => {
    let isCurrent = true;
    data.dataViews
      .create({ title: OTEL_INDEX_PATTERN, timeFieldName: '@timestamp' }, undefined, false)
      // No matching indices yet: there is nothing to suggest.
      .catch(() => undefined)
      .then((dataView) => {
        if (isCurrent) {
          setDataViewState({ dataView });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [data.dataViews]);

  const onQuerySubmit = useCallback<OnQuerySubmit>(
    ({ query }) => {
      const nextKuery = typeof query?.query === 'string' ? query.query.trim() : '';
      const error = nextKuery === '' ? undefined : kueryErrorOf(nextKuery);
      setKueryError(error);
      if (error) {
        return;
      }
      if (nextKuery === (kuery ?? '')) {
        onRefresh();
        return;
      }
      setKuery(nextKuery);
    },
    [kuery, setKuery, onRefresh]
  );

  // Kept between renders: the bar resets what is being typed when its query prop changes.
  const query = useMemo<Query>(() => ({ query: kuery ?? '', language: 'kuery' }), [kuery]);

  // Waits for the data view: a bar that gets its fields later starts over, and drops what is being
  // typed. The skeleton is as tall as the bar, so the page does not move.
  if (!dataViewState) {
    return (
      <EuiSkeletonRectangle
        width="100%"
        height="32px"
        borderRadius="m"
        data-test-subj="digitalExperienceOverviewSearchBarLoading"
      />
    );
  }

  // While the bar has the focus it takes the whole row, over the filters and the date picker next
  // to it, which wait under it; the row's space for the bar stays, so nothing moves. The row is the
  // nearest positioned ancestor (`otel_overview.tsx`).
  const expandOnFocusCss = css({
    inlineSize: '100%',
    '&:focus-within': {
      position: 'absolute',
      insetBlockStart: 0,
      insetInlineStart: 0,
      // Above the controls that follow it in the row, which are positioned too.
      zIndex: Number(euiTheme.levels.content) + 1,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      boxShadow: `0 0 0 ${euiTheme.size.xs} ${euiTheme.colors.backgroundBasePlain}`,
    },
  });

  return (
    <div css={expandOnFocusCss} data-test-subj="digitalExperienceOverviewSearch">
      <unifiedSearch.ui.SearchBar
        appName={DIGITAL_EXPERIENCE_FEATURE_ID}
        displayStyle="inPage"
        iconType="search"
        placeholder={PLACEHOLDER}
        indexPatterns={dataViewState.dataView ? [dataViewState.dataView] : undefined}
        query={query}
        showQueryInput
        showQueryMenu={false}
        showFilterBar={false}
        showDatePicker={false}
        showSubmitButton={false}
        disableQueryLanguageSwitcher
        onQuerySubmit={onQuerySubmit}
        dataTestSubj="digitalExperienceOverviewSearchBar"
      />
      {kueryError && (
        <EuiFormErrorText data-test-subj="digitalExperienceOverviewKueryError">
          {kueryError}
        </EuiFormErrorText>
      )}
    </div>
  );
}
