/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useAttackDetailsContext } from '../context';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import { NOTES_TAB_TEST_ID } from '../constants/test_ids';
import type { AttackDetailsLeftPanelProps } from '../types';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { InsightsTab } from './tabs/insights_tab';
import { NotesTab } from './tabs/notes_tab';

const INSIGHTS_TAB_ID = 'insights' as const;
const NOTES_TAB_ID = 'notes' as const;
const ENTITIES_SUB_TAB_ID = 'entity' as const;

/**
 * Left panel of the Attack Details flyout. Rendered when the user clicks "Expand details"
 * in the right panel. Uses the same attack context (attackId, indexName) as the right panel.
 * Shows Insights tab with Entities sub-view and Notes tab.
 */
export const AttackDetailsLeftPanel: FC<Partial<AttackDetailsLeftPanelProps>> = memo(({ path }) => {
  const { euiTheme } = useEuiTheme();
  const { attackId, indexName } = useAttackDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { notesPrivileges } = useUserPrivileges();

  const showNotesTab = notesPrivileges.read;
  const selectedTabId = path?.tab ?? INSIGHTS_TAB_ID;

  return (
    <>
      <FlyoutHeader
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          padding-bottom: 0 !important;
          border-block-end: none !important;
        `}
      >
        <EuiTabs size="l">
          <EuiTab
            onClick={() =>
              openLeftPanel({
                id: AttackDetailsLeftPanelKey,
                params: { attackId, indexName },
                path: { tab: INSIGHTS_TAB_ID, subTab: ENTITIES_SUB_TAB_ID },
              })
            }
            isSelected={selectedTabId === INSIGHTS_TAB_ID}
            data-test-subj="attack-details-left-insights-tab"
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.attackDetails.left.insights.tabLabel"
              defaultMessage="Insights"
            />
          </EuiTab>
          {showNotesTab && (
            <EuiTab
              onClick={() =>
                openLeftPanel({
                  id: AttackDetailsLeftPanelKey,
                  params: { attackId, indexName },
                  path: { tab: NOTES_TAB_ID },
                })
              }
              isSelected={selectedTabId === NOTES_TAB_ID}
              data-test-subj={NOTES_TAB_TEST_ID}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.notes.tabLabel"
                defaultMessage="Notes"
              />
            </EuiTab>
          )}
        </EuiTabs>
      </FlyoutHeader>
      <FlyoutBody
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        {selectedTabId === INSIGHTS_TAB_ID && <InsightsTab />}
        {selectedTabId === NOTES_TAB_ID && <NotesTab />}
      </FlyoutBody>
    </>
  );
});

AttackDetailsLeftPanel.displayName = 'AttackDetailsLeftPanel';
