/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { MobileSection } from '../mobile_section';
import { ReleaseAdoptionChart, ReleaseErrorRateChart } from './release_charts';
import { getReleaseColors } from './release_colors';
import { DEFAULT_RELEASE_SORT, ReleaseTable, type ReleaseSort } from './release_table';
import type { MobileReleasesState } from './use_mobile_releases';

const TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.title', {
  defaultMessage: 'Release health',
});

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.releases.loadError', {
  defaultMessage: 'Could not load the release health',
});

const LOADING_LABEL = i18n.translate('xpack.digitalExperience.mobile.releases.loading', {
  defaultMessage: 'Loading the release health',
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

/** The release health of the application: its releases in a table, and over time in two charts. */
export function ReleaseHealth({
  releasesState: { releases: response, ...state },
  ...releaseFilter
}: ReleaseFilterProps & { releasesState: MobileReleasesState }) {
  const [sort, setSort] = useState<ReleaseSort>(DEFAULT_RELEASE_SORT);

  return (
    <MobileSection
      title={TITLE}
      state={{ response, ...state }}
      isEmpty={({ releases }) => releases.length === 0}
      emptyMessage={NO_RELEASES}
      loadErrorTitle={LOAD_ERROR_TITLE}
      loadingLabel={LOADING_LABEL}
      data-test-subj="digitalExperienceMobileReleaseHealth"
      testSubjPrefix="digitalExperienceMobileReleases"
    >
      {(loaded) => (
        <ReleaseHealthContent response={loaded} {...releaseFilter} sort={sort} onSort={setSort} />
      )}
    </MobileSection>
  );
}
