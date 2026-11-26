/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { LoadErrorPrompt } from '../../../../components/load_error_prompt';
import { MOBILE_APPLICATION_EBT_ELEMENTS } from '../../../../ebt_constants';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ReleaseAdoptionChart, ReleaseErrorRateChart } from './release_charts';
import { getReleaseColors } from './release_colors';
import { DEFAULT_RELEASE_SORT, ReleaseTable, type ReleaseSort } from './release_table';
import type { MobileReleasesState } from './use_mobile_releases';

const LOADING_HEIGHT = 240;

const TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.title', {
  defaultMessage: 'Release health',
});

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.loadError', {
  defaultMessage: 'Could not load the release health',
});

const NO_RELEASES = i18n.translate('xpack.digitalExperience.mobile.releases.empty', {
  defaultMessage: 'No release reported sessions in the selected time range',
});

type SelectRelease = (release: string | undefined) => void;

interface ReleaseFilterProps {
  selectedRelease: string | undefined;
  onSelectRelease: SelectRelease;
  /** Every release with data, whatever the filter, so colours don't change when filtering. */
  rankedReleases: readonly string[];
}

interface ContentProps extends ReleaseFilterProps {
  /** Kept here, so a reload doesn't reset it. */
  sort: ReleaseSort;
  onSort: (sort: ReleaseSort) => void;
}

const ReleaseHealthContent = React.memo(function ReleaseHealthContent({
  response: { releases, series, markers, histogram },
  selectedRelease,
  onSelectRelease,
  rankedReleases,
  sort,
  onSort,
}: ContentProps & { response: MobileReleasesResponse }) {
  const { euiTheme } = useEuiTheme();
  const { setTimeRange } = useTimeRange();
  const colors = useMemo(
    () => getReleaseColors(releases, euiTheme.colors.vis, rankedReleases),
    [releases, euiTheme.colors.vis, rankedReleases]
  );
  const chartProps = useMemo(
    () => ({ series, markers, histogram, colors, onTimeRangeSelect: setTimeRange }),
    [series, markers, histogram, colors, setTimeRange]
  );

  return (
    <>
      <ReleaseTable
        releases={releases}
        colors={colors}
        selectedRelease={selectedRelease}
        onSelectRelease={onSelectRelease}
        sort={sort}
        onSort={onSort}
      />
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2} gutterSize="m">
        <EuiFlexItem>
          <ReleaseErrorRateChart releases={releases} {...chartProps} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ReleaseAdoptionChart {...chartProps} />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
});

const sectionBody = (
  { releases: response, isLoading, error, refresh }: MobileReleasesState,
  contentProps: ContentProps
): ReactNode => {
  if (error) {
    return (
      <LoadErrorPrompt
        data-test-subj="digitalExperienceMobileReleasesError"
        retryDataTestSubj="digitalExperienceMobileReleasesRetry"
        retryEbtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RETRY}
        title={LOAD_ERROR_TITLE}
        error={error}
        onRetry={refresh}
        headingLevel="h3"
      />
    );
  }
  if (isLoading || !response) {
    return (
      <EuiFlexGroup
        css={{ blockSize: LOADING_HEIGHT }}
        alignItems="center"
        justifyContent="center"
        data-test-subj="digitalExperienceMobileReleasesLoading"
      >
        <EuiLoadingChart size="l" />
      </EuiFlexGroup>
    );
  }
  if (response.releases.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="digitalExperienceMobileReleasesEmpty">
        {NO_RELEASES}
      </EuiText>
    );
  }
  return <ReleaseHealthContent response={response} {...contentProps} />;
};

/** The release health of the application: its releases in a table, and over time in two charts. */
export function ReleaseHealth({
  releasesState,
  ...releaseFilter
}: ReleaseFilterProps & { releasesState: MobileReleasesState }) {
  const titleId = useGeneratedHtmlId({ prefix: 'releaseHealthTitle' });
  const [sort, setSort] = useState<ReleaseSort>(DEFAULT_RELEASE_SORT);

  return (
    <section aria-labelledby={titleId} data-test-subj="digitalExperienceMobileReleaseHealth">
      <EuiTitle size="s">
        <h2 id={titleId}>{TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {sectionBody(releasesState, { ...releaseFilter, sort, onSort: setSort })}
    </section>
  );
}
