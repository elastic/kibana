/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { WatchSkill } from '@kbn/pnd-common';
import { useSkills } from '../../../hooks/use_skills_api';
import { formatRelativeTime } from '../components/format_relative_time';
import {
  flushLastRowStyles,
  oneLineCellStyles,
  truncatedDescriptionStyles,
} from '../components/table_styles';
import { WatchBadges } from '../components/watch_badges';
import * as sectionI18n from '../translations';
import * as i18n from './translations';

/**
 * The Skills catalog, read-only.
 *
 * ⛔ There is deliberately no Enabled column and no switch (bead kibana-phf4.33): the 2026-08-10
 * declutter removed the per-row enable toggles from both catalogs and the watch detail page. The write
 * path itself survives untouched — `useToggleSkill` and `PATCH /internal/pnd/skills/{skillId}` are
 * upstream's (#284009) and a skill's global flag is a real stored field — so this is a surface
 * decision, not a contract change. It does mean that flag currently has no producer in the UI, which
 * register `#38` records.
 */
export const SkillsTable: React.FC = () => {
  const { data, isLoading, error } = useSkills();

  const columns = useMemo<Array<EuiBasicTableColumn<WatchSkill>>>(
    () => [
      {
        field: 'id',
        name: i18n.COL_SKILL,
        render: (_id: string, skill: WatchSkill) => {
          const description = i18n.skillDescription(skill.id);
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{i18n.skillName(skill.id)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {skill.lifecycle && skill.lifecycle !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {skill.lifecycle === 'beta'
                          ? sectionI18n.LIFECYCLE_BETA
                          : sectionI18n.LIFECYCLE_PILOT}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              {description ? (
                <EuiFlexItem grow={false}>
                  {/* One line only — the full text is the title, per the 2026-08-10 declutter. */}
                  <EuiText size="xs" color="subdued">
                    <span css={truncatedDescriptionStyles} title={description}>
                      {description}
                    </span>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'watchIds',
        name: i18n.COL_WATCHES,
        width: '220px',
        render: (watchIds: string[]) => <WatchBadges watchIds={watchIds} />,
      },
      {
        field: 'lastRun',
        name: i18n.COL_LAST_RUN,
        width: '140px',
        // A skill is invoked rather than run continuously, so there is no health to report here —
        // just when it last ran.
        render: (lastRun: string | null) => (
          <EuiText size="s" color={lastRun == null ? 'subdued' : undefined}>
            {lastRun == null ? sectionI18n.NOT_RUN_YET : formatRelativeTime(lastRun)}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <EuiBasicTable
      items={data?.skills ?? []}
      columns={columns}
      css={[flushLastRowStyles, oneLineCellStyles]}
      tableCaption={i18n.TABLE_CAPTION}
      loading={isLoading}
      error={error ? i18n.LOAD_ERROR : undefined}
      noItemsMessage={i18n.NO_SKILLS}
      data-test-subj="pndSkillsTable"
    />
  );
};
