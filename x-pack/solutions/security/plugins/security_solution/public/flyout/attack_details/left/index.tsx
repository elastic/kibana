/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutLoading } from '../../../flyout_v2/shared/components/flyout_loading';
import { FlyoutError } from '../../../flyout_v2/shared/components/flyout_error';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import {
  ENTITIES_TAB_ID,
  INSIGHTS_TAB_ID,
  NOTES_TAB_ID,
  type LeftPanelPaths,
} from '../constants/left_panel_paths';
import { useAttackHit } from '../hooks/use_attack_hit';
import type { AttackDetailsLeftPanelProps } from '../types';
import { NotesTab } from './tabs/notes_tab';
import { InsightsSubPanel } from './insights_sub_panel';

/** Thin left-panel wrapper: fetches the attack hit and renders Insights / Notes tabs backed by v2 components. */
export const AttackDetailsLeftPanel: FC<Partial<AttackDetailsLeftPanelProps>> = memo(
  ({ params, path }) => {
    const { euiTheme } = useEuiTheme();
    const attackId = params?.attackId ?? '';
    const indexName = params?.indexName ?? '';
    const { hit, loading } = useAttackHit(attackId, indexName);
    const { openLeftPanel } = useExpandableFlyoutApi();
    const { notesPrivileges } = useUserPrivileges();

    const tab = (path?.tab as LeftPanelPaths) ?? INSIGHTS_TAB_ID;
    const subTab = path?.subTab ?? ENTITIES_TAB_ID;

    const setTab = useCallback(
      (nextTab: LeftPanelPaths) =>
        openLeftPanel({
          id: AttackDetailsLeftPanelKey,
          params: { attackId, indexName },
          path: {
            tab: nextTab,
            ...(nextTab === INSIGHTS_TAB_ID ? { subTab: ENTITIES_TAB_ID } : {}),
          },
        }),
      [attackId, indexName, openLeftPanel]
    );

    if (loading) return <FlyoutLoading />;
    if (!hit) return <FlyoutError />;

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
            <EuiTab onClick={() => setTab(INSIGHTS_TAB_ID)} isSelected={tab === INSIGHTS_TAB_ID}>
              <FormattedMessage
                id="xpack.securitySolution.flyout.attackDetails.left.insights.tabLabel"
                defaultMessage="Insights"
              />
            </EuiTab>
            {notesPrivileges.read && (
              <EuiTab onClick={() => setTab(NOTES_TAB_ID)} isSelected={tab === NOTES_TAB_ID}>
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
          {tab === INSIGHTS_TAB_ID && (
            <InsightsSubPanel hit={hit} attackId={attackId} indexName={indexName} subTab={subTab} />
          )}
          {tab === NOTES_TAB_ID && <NotesTab hit={hit} />}
        </FlyoutBody>
      </>
    );
  }
);

AttackDetailsLeftPanel.displayName = 'AttackDetailsLeftPanel';
