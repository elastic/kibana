/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
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
import type { WatchCallableRef } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';
import { SettingsSection } from './settings_section';
import * as skillI18n from '../skills_table_translations';
import * as settingsI18n from '../settings_translations';

interface WorkerSkillsTableProps {
  skills?: WatchCallableRef[];
}

export const WorkerSkillsTable: React.FC<WorkerSkillsTableProps> = ({ skills }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WatchCallableRef>>>(
    () => [
      {
        field: 'id',
        name: '',
        render: (id: string, row: WatchCallableRef) => {
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{row.name || skillI18n.skillName(id)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {row?.summary}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    []
  );

  return skills && skills.length > 0 ? (
    <EuiFlexItem grow={false}>
      <SettingsSection
        title={settingsI18n.SKILLS_SECTION_TITLE}
        subtitle={settingsI18n.SKILLS_SECTION_SUBTITLE}
        data-test-subj="pndWatchSkillsSection"
      >
        <EuiBasicTable
          css={tableNoOuterBordersCss}
          items={skills}
          columns={columns}
          tableLayout="auto"
          tableCaption={i18n.SKILLS_SECTION_SUBTITLE}
          data-test-subj="pndWatchSkillsTable"
        />
      </SettingsSection>
    </EuiFlexItem>
  ) : null;
};
