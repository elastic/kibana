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
import type { WatchSkill, WatchSkillAttachment } from '@kbn/pnd-common';
import { useSkills } from '../../../hooks/use_skills_api';
import { formatRelativeTime } from './format_relative_time';
import { flushLastRowStyles, hiddenColumnHeaderStyles } from './table_styles';
import * as sectionI18n from '../translations';
import * as i18n from '../settings_translations';
import * as skillI18n from '../skills/translations';

interface SkillRow {
  skillId: string;
  attachedEnabled: boolean;
  skill: WatchSkill | undefined;
}

/**
 * A skill is invoked rather than run continuously, so it reports no health of its own — the status
 * line is enablement plus when it last ran.
 */
const statusLine = (row: SkillRow): string => {
  const { skill, attachedEnabled } = row;
  if (!skill) {
    return i18n.STATUS_UNAVAILABLE;
  }
  if (!skill.enabled) {
    return i18n.STATUS_DISABLED_GLOBALLY;
  }
  if (!attachedEnabled) {
    return i18n.STATUS_DISABLED;
  }

  const parts = [i18n.STATUS_ENABLED];
  if (skill.lastRun) {
    parts.push(i18n.lastRunStatus(formatRelativeTime(skill.lastRun)));
  }
  return parts.join(' · ');
};

interface WatchSkillsTableProps {
  attachments: WatchSkillAttachment[];
}

/**
 * The skills this watch attaches, read-only.
 *
 * ⛔ There is deliberately no Enabled column and no switch (bead kibana-phf4.33). The 2026-08-10
 * declutter removed the per-row enable toggles from the watch detail page and both catalogs, so
 * enablement is reported in the status line and changed nowhere in the UI. Adding a toggle back means
 * re-adding a draft field and a Save path with it — see the note on `WatchSettingsDraft`.
 */
export const WatchSkillsTable: React.FC<WatchSkillsTableProps> = ({ attachments }) => {
  const { data } = useSkills();

  const rows = useMemo<SkillRow[]>(() => {
    const byId = new Map((data?.skills ?? []).map((skill) => [skill.id, skill]));
    return attachments.map(({ skillId, enabled }) => ({
      skillId,
      attachedEnabled: enabled,
      skill: byId.get(skillId),
    }));
  }, [attachments, data?.skills]);

  const columns = useMemo<Array<EuiBasicTableColumn<SkillRow>>>(
    () => [
      {
        field: 'skillId',
        name: i18n.COL_SKILL,
        render: (skillId: string, row: SkillRow) => {
          const isGloballyOff = row.skill != null && !row.skill.enabled;
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color={isGloballyOff ? 'subdued' : undefined}>
                      <strong>{skillI18n.skillName(skillId)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {row.skill?.lifecycle && row.skill.lifecycle !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {row.skill.lifecycle === 'beta'
                          ? sectionI18n.LIFECYCLE_BETA
                          : sectionI18n.LIFECYCLE_PILOT}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {statusLine(row)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    []
  );

  return (
    /*
      No column header: this table renders only on the watch detail page, whose "Skills" section title
      already names the list (2026-08-13 declutter). `tableCaption` is what names it to a screen reader
      now that the `thead` is gone.
    */
    <EuiBasicTable
      items={rows}
      columns={columns}
      css={[flushLastRowStyles, hiddenColumnHeaderStyles]}
      tableLayout="auto"
      tableCaption={i18n.SKILLS_SECTION_SUBTITLE}
      data-test-subj="pndWatchSkillsTable"
    />
  );
};
