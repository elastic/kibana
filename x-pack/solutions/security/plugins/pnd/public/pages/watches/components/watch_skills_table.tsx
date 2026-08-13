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
  EuiSwitch,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { WatchSkill, WatchSkillAttachment } from '@kbn/pnd-common';
import { useSkills } from '../../../hooks/use_skills_api';
import { formatRelativeTime } from './format_relative_time';
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
  onToggle: (skillId: string, enabled: boolean) => void;
}

export const WatchSkillsTable: React.FC<WatchSkillsTableProps> = ({ attachments, onToggle }) => {
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
      {
        field: 'attachedEnabled',
        name: i18n.COL_ENABLED,
        width: '100px',
        align: 'right',
        render: (attachedEnabled: boolean, row: SkillRow) => {
          const isGloballyOff = row.skill != null && !row.skill.enabled;
          const control = (
            <EuiSwitch
              checked={attachedEnabled && !isGloballyOff}
              disabled={isGloballyOff}
              showLabel={false}
              label={skillI18n.enableSkillAriaLabel(skillI18n.skillName(row.skillId))}
              data-test-subj={`pndWatchSkillToggle-${row.skillId}`}
              onChange={(event) => onToggle(row.skillId, event.target.checked)}
            />
          );

          return isGloballyOff ? (
            <EuiToolTip content={i18n.STATUS_DISABLED_GLOBALLY}>{control}</EuiToolTip>
          ) : (
            control
          );
        },
      },
    ],
    [onToggle]
  );

  return (
    <EuiBasicTable
      items={rows}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.SKILLS_SECTION_SUBTITLE}
      data-test-subj="pndWatchSkillsTable"
    />
  );
};
