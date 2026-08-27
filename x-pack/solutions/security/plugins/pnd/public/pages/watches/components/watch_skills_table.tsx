/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';

const tableNoOuterBordersCss = css`
  thead {
    display: none;
  }
  tbody tr:first-child td {
    border-top: none;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
`;
import type { WatchCallableRef, WatchSkill } from '@kbn/pnd-common';
import { useSkills } from '../../../hooks/use_skills_api';
import { formatRelativeTime } from './format_relative_time';
import * as sectionI18n from '../translations';
import * as i18n from '../settings_translations';
import * as skillI18n from '../skills/translations';

interface SkillRow {
  skillId: string;
  name: string;
  skill: WatchSkill | undefined;
}

/**
 * A skill is invoked rather than run continuously, so it reports no health of its own — the status
 * line is enablement plus when it last ran.
 */
const statusLine = (row: SkillRow): string => {
  const { skill } = row;
  if (!skill) {
    return i18n.STATUS_UNAVAILABLE;
  }

  const parts = [];
  if (skill.lastRun) {
    parts.push(i18n.lastRunStatus(formatRelativeTime(skill.lastRun)));
  }
  return parts.join(' · ');
};

interface WatchSkillsTableProps {
  attachments: WatchCallableRef[];
}

export const WatchSkillsTable: React.FC<WatchSkillsTableProps> = ({ attachments }) => {
  const { data } = useSkills();

  const rows = useMemo<SkillRow[]>(() => {
    const byId = new Map((data?.skills ?? []).map((skill) => [skill.id, skill]));
    return attachments.map(({ id, name }) => ({
      skillId: id,
      name,
      skill: byId.get(id),
    }));
  }, [attachments, data?.skills]);

  const columns = useMemo<Array<EuiBasicTableColumn<SkillRow>>>(
    () => [
      {
        field: 'skillId',
        name: '',
        render: (skillId: string, row: SkillRow) => {
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{row.name || skillI18n.skillName(skillId)}</strong>
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
    <EuiBasicTable
      css={tableNoOuterBordersCss}
      items={rows}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.SKILLS_SECTION_SUBTITLE}
      data-test-subj="pndWatchSkillsTable"
    />
  );
};
