/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { AtlasSubTechnique, AtlasTactic, AtlasTechnique } from './atlas_matrix_helpers';
import { AtlasPlatformFilter } from './atlas_platform_filter';
import type { AtlasPlatform } from './atlas_platforms';
import {
  ATLAS_PLATFORMS_DEFAULT_SELECTED,
  techniqueMatchesSelectedPlatforms,
} from './atlas_platforms';
import { coverageOverviewPanelWidth } from './constants';
import { getPrototypeRuleCount } from './prototype_coverage_colors';
import { RuleActivityFilter } from './rule_activity_filter';
import { CoverageOverviewLegend } from './shared_components/dashboard_legend';
import { CoverageOverviewPanelRuleStats } from './shared_components/panel_rule_stats';
import { useAtlasMatrix } from './use_atlas_matrix';
import { useCoverageColors } from './use_coverage_colors';
import * as i18n from './translations';

const getPrototypeEnabledDisabledCounts = (techniqueIndex: number) => {
  const total = getPrototypeRuleCount(techniqueIndex);
  const enabledRules = Math.ceil((total * 2) / 3);
  const disabledRules = total - enabledRules;
  return { enabledRules, disabledRules, total };
};

const getPrototypeRuleCountsByActivity = (
  techniqueIndex: number,
  activity?: CoverageOverviewRuleActivity[]
): number => {
  const { enabledRules, disabledRules, total } = getPrototypeEnabledDisabledCounts(techniqueIndex);

  if (!activity || activity.length === 0) {
    return total;
  }

  let count = 0;
  if (activity.includes(CoverageOverviewRuleActivity.Enabled)) {
    count += enabledRules;
  }
  if (activity.includes(CoverageOverviewRuleActivity.Disabled)) {
    count += disabledRules;
  }
  return count;
};

const AtlasTacticHeader = memo(function AtlasTacticHeader({ tactic }: { tactic: AtlasTactic }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      data-test-subj="atlasCoverageTacticPanel"
      hasShadow={false}
      hasBorder
      paddingSize="s"
      className={css`
        background: ${euiTheme.colors.lightestShade};
        border-color: ${euiTheme.colors.mediumShade};
        width: ${coverageOverviewPanelWidth}px;
      `}
    >
      <EuiToolTip content={tactic.name}>
        <EuiText
          tabIndex={0}
          className={css`
            h4 {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          `}
          aria-label={tactic.name}
          title={tactic.name}
          size="xs"
        >
          <h4>{tactic.name}</h4>
        </EuiText>
      </EuiToolTip>
      <EuiText size="xs" color="subdued">
        {tactic.id}
      </EuiText>
    </EuiPanel>
  );
});

const AtlasSubTechniqueCell = memo(function AtlasSubTechniqueCell({
  subTechnique,
  ruleCount,
}: {
  subTechnique: AtlasSubTechnique;
  ruleCount: number;
}) {
  const { getColorsForValue } = useCoverageColors();
  const techniqueColors = getColorsForValue(ruleCount);

  return (
    <EuiPanel
      data-test-subj={`atlasCoverageSubTechniquePanel-${subTechnique.id}`}
      hasShadow={false}
      hasBorder={!techniqueColors}
      paddingSize="s"
      className={css`
        background: ${techniqueColors?.backgroundColor};
        color: ${techniqueColors?.textColor};
        margin-left: 12px;
        width: ${coverageOverviewPanelWidth - 12}px;
      `}
    >
      <EuiText size="xs">
        <h4>{subTechnique.name}</h4>
      </EuiText>
      <EuiText size="xs" color={techniqueColors ? undefined : 'subdued'}>
        {subTechnique.id}
      </EuiText>
    </EuiPanel>
  );
});

const AtlasTechniqueCell = memo(function AtlasTechniqueCell({
  technique,
  techniqueIndex,
  activity,
  isExpanded,
}: {
  technique: AtlasTechnique;
  techniqueIndex: number;
  activity: CoverageOverviewRuleActivity[];
  isExpanded: boolean;
}) {
  const { getColorsForValue } = useCoverageColors();
  const ruleCount = getPrototypeRuleCountsByActivity(techniqueIndex, activity);
  const { enabledRules, disabledRules } = getPrototypeEnabledDisabledCounts(techniqueIndex);
  const techniqueColors = getColorsForValue(ruleCount);

  const coveredCount = useMemo(
    () =>
      technique.subtechniques.filter(
        (_, subIndex) =>
          getPrototypeRuleCountsByActivity(techniqueIndex + subIndex + 1, activity) > 0
      ).length,
    [activity, technique.subtechniques, techniqueIndex]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPanel
          data-test-subj={`atlasCoverageTechniquePanel-${technique.id}`}
          hasShadow={false}
          hasBorder={!techniqueColors}
          paddingSize="s"
          className={css`
            background: ${techniqueColors?.backgroundColor};
            color: ${techniqueColors?.textColor};
            width: ${coverageOverviewPanelWidth}px;
          `}
        >
          <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="xs">
                <h4>{technique.name}</h4>
              </EuiText>
              <EuiText size="xs" color={techniqueColors ? undefined : 'subdued'}>
                {technique.id}
              </EuiText>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
                <EuiFlexItem
                  className={css`
                    white-space: nowrap;
                  `}
                  grow={false}
                >
                  <EuiText size="xs">{i18n.SUBTECHNIQUES}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {`${coveredCount}/${technique.subtechniques.length}`}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {isExpanded && (
              <EuiFlexItem grow={false}>
                <CoverageOverviewPanelRuleStats
                  enabledRules={
                    !activity.length || activity.includes(CoverageOverviewRuleActivity.Enabled)
                      ? enabledRules
                      : 0
                  }
                  disabledRules={
                    !activity.length || activity.includes(CoverageOverviewRuleActivity.Disabled)
                      ? disabledRules
                      : 0
                  }
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      {isExpanded &&
        technique.subtechniques.map((subTechnique, subIndex) => (
          <EuiFlexItem grow={false} key={subTechnique.id}>
            <AtlasSubTechniqueCell
              subTechnique={subTechnique}
              ruleCount={getPrototypeRuleCountsByActivity(techniqueIndex + subIndex + 1, activity)}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
});

const filterAtlasTactics = ({
  tactics,
  selectedPlatforms,
  searchTerm,
}: {
  tactics: AtlasTactic[];
  selectedPlatforms: readonly AtlasPlatform[];
  searchTerm: string;
}): AtlasTactic[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (id: string, name: string) =>
    !normalizedSearch ||
    id.toLowerCase().includes(normalizedSearch) ||
    name.toLowerCase().includes(normalizedSearch);

  return tactics
    .map((tactic) => ({
      ...tactic,
      techniques: tactic.techniques
        .map((technique) => ({
          ...technique,
          subtechniques: technique.subtechniques.filter(
            (sub) =>
              techniqueMatchesSelectedPlatforms(sub.platforms, selectedPlatforms) &&
              matchesSearch(sub.id, sub.name)
          ),
        }))
        .filter(
          (technique) =>
            (techniqueMatchesSelectedPlatforms(technique.platforms, selectedPlatforms) ||
              technique.subtechniques.length > 0) &&
            (matchesSearch(technique.id, technique.name) || technique.subtechniques.length > 0)
        ),
    }))
    .filter((tactic) => tactic.techniques.length > 0 || matchesSearch(tactic.id, tactic.name));
};

const AtlasMatrixComponent = () => {
  const { tactics, isLoading, error } = useAtlasMatrix(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<AtlasPlatform[]>(
    ATLAS_PLATFORMS_DEFAULT_SELECTED
  );
  const [activityFilter, setActivityFilter] = useState<CoverageOverviewRuleActivity[]>([
    CoverageOverviewRuleActivity.Enabled,
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpandedCells, setShowExpandedCells] = useState(false);

  const handleSearch = useCallback((queryText: string) => {
    setSearchTerm(queryText?.trim() ?? '');
  }, []);

  const filteredTactics = useMemo(() => {
    if (!tactics) {
      return null;
    }
    return filterAtlasTactics({
      tactics,
      selectedPlatforms,
      searchTerm,
    });
  }, [searchTerm, selectedPlatforms, tactics]);

  const filtersAndLegend = (
    <EuiPanel data-test-subj="atlasCoverageFiltersPanel">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={0}>
              <RuleActivityFilter
                selected={activityFilter}
                onChange={setActivityFilter}
                isLoading={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={0}>
              <AtlasPlatformFilter
                selected={selectedPlatforms}
                onChange={setSelectedPlatforms}
                isLoading={isLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                incremental={false}
                data-test-subj="atlasCoverageFilterSearchBar"
                placeholder={i18n.CoverageOverviewSearchBarPlaceholder}
                onSearch={handleSearch}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  withNext
                  isToggle
                  isSelected={!showExpandedCells}
                  hasActiveFilters={!showExpandedCells}
                  onClick={() => setShowExpandedCells(false)}
                  data-test-subj="atlasCoverageCollapseCellsButton"
                >
                  {i18n.COLLAPSE_CELLS_FILTER_BUTTON}
                </EuiFilterButton>
                <EuiFilterButton
                  isToggle
                  isSelected={showExpandedCells}
                  hasActiveFilters={showExpandedCells}
                  onClick={() => setShowExpandedCells(true)}
                  data-test-subj="atlasCoverageExpandCellsButton"
                >
                  {i18n.EXPAND_CELLS_FILTER_BUTTON}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CoverageOverviewLegend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (isLoading) {
    return (
      <>
        {filtersAndLegend}
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18n.ATLAS_MATRIX_LOADING}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  if (error || !filteredTactics) {
    return (
      <>
        {filtersAndLegend}
        <EuiSpacer />
        <EuiEmptyPrompt
          color="danger"
          iconType="error"
          title={<h2>{i18n.ATLAS_MATRIX_ERROR}</h2>}
          data-test-subj="atlasCoverageMatrixError"
        />
      </>
    );
  }

  if (filteredTactics.length === 0) {
    return (
      <>
        {filtersAndLegend}
        <EuiSpacer />
        <EuiEmptyPrompt
          title={<h2>{i18n.ATLAS_NO_TECHNIQUES_MATCH_PLATFORMS}</h2>}
          data-test-subj="atlasCoverageNoPlatformMatches"
        />
      </>
    );
  }

  return (
    <>
      {filtersAndLegend}
      <EuiSpacer />
      <EuiFlexGroup
        gutterSize="m"
        className="eui-xScroll"
        tabIndex={0}
        alignItems="flexStart"
        responsive={false}
        data-test-subj="atlasCoverageMatrix"
      >
        {filteredTactics.map((tactic) => (
          <EuiFlexItem
            grow={false}
            key={tactic.id}
            data-test-subj={`atlasCoverageTacticGroup-${tactic.id}`}
          >
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <AtlasTacticHeader tactic={tactic} />
              </EuiFlexItem>
              {tactic.techniques.map((technique, techniqueIndex) => (
                <EuiFlexItem grow={false} key={technique.id}>
                  <AtlasTechniqueCell
                    technique={technique}
                    techniqueIndex={techniqueIndex}
                    activity={activityFilter}
                    isExpanded={showExpandedCells}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};

export const AtlasMatrix = memo(AtlasMatrixComponent);
