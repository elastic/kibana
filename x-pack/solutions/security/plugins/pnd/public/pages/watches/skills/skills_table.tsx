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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { WatchSkill } from '@kbn/pnd-common';
import { useSkills, useToggleSkill } from '../../../hooks/use_skills_api';
import { formatRelativeTime } from '../components/format_relative_time';
import { WatchBadges } from '../components/watch_badges';
import * as sectionI18n from '../translations';
import * as i18n from './translations';

export const SkillsTable: React.FC = () => {
  const { data, isLoading, error } = useSkills();
  const { mutate: toggleSkill } = useToggleSkill();

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
                  <EuiText size="xs" color="subdued">
                    {description}
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
      {
        field: 'enabled',
        name: i18n.COL_ENABLED,
        width: '100px',
        align: 'right',
        render: (enabled: boolean, skill: WatchSkill) => (
          <EuiSwitch
            checked={enabled}
            showLabel={false}
            label={i18n.enableSkillAriaLabel(i18n.skillName(skill.id))}
            data-test-subj={`pndSkillToggle-${skill.id}`}
            onChange={(event) => toggleSkill({ skillId: skill.id, enabled: event.target.checked })}
          />
        ),
      },
    ],
    [toggleSkill]
  );

  return (
    <EuiBasicTable
      items={data?.skills ?? []}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.TABLE_CAPTION}
      loading={isLoading}
      error={error ? i18n.LOAD_ERROR : undefined}
      noItemsMessage={i18n.NO_SKILLS}
      data-test-subj="pndSkillsTable"
    />
  );
};
