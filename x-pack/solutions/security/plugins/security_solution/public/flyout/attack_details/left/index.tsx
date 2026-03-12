/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useAttackDetailsContext } from '../context';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import type { AttackDetailsLeftPanelProps } from '../types';
import { AttackEntitiesDetails } from './components/attack_entities_details';

const INSIGHTS_TAB_ID = 'insights' as const;
const ENTITIES_SUB_TAB_ID = 'entity' as const;

const insightsSubTabButtons: EuiButtonGroupOptionProps[] = [
  {
    id: ENTITIES_SUB_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entitiesButtonLabel"
        defaultMessage="Entities"
      />
    ),
    'data-test-subj': 'attack-details-left-insights-entities-button',
  },
];

/**
 * Left panel of the Attack Details flyout. Rendered when the user clicks "Expand details"
 * in the right panel. Uses the same attack context (attackId, indexName) as the right panel.
 * Shows Insights tab with Entities sub-view (related users and hosts from attack alerts).
 */
export const AttackDetailsLeftPanel: FC<Partial<AttackDetailsLeftPanelProps>> = memo(({ path }) => {
  const { euiTheme } = useEuiTheme();
  const { attackId, indexName } = useAttackDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const selectedTabId = path?.tab ?? INSIGHTS_TAB_ID;
  const activeSubTabId = path?.subTab ?? ENTITIES_SUB_TAB_ID;

  const setSubTab = useCallback(
    (subTab: string) => {
      openLeftPanel({
        id: AttackDetailsLeftPanelKey,
        params: { attackId, indexName },
        path: { tab: INSIGHTS_TAB_ID, subTab },
      });
    },
    [openLeftPanel, attackId, indexName]
  );

  const onChangeSubTab = useCallback(
    (optionId: string) => {
      setSubTab(optionId);
    },
    [setSubTab]
  );

  const insightsContent = useMemo(
    () => (
      <>
        <EuiButtonGroup
          color="primary"
          legend={i18n.translate(
            'xpack.securitySolution.flyout.attackDetails.left.insights.buttonGroupLegend',
            { defaultMessage: 'Insights options' }
          )}
          options={insightsSubTabButtons}
          idSelected={activeSubTabId}
          onChange={onChangeSubTab}
          buttonSize="compressed"
          isFullWidth
          data-test-subj="attack-details-left-insights-button-group"
        />
        <EuiSpacer size="m" />
        {activeSubTabId === ENTITIES_SUB_TAB_ID && <AttackEntitiesDetails />}
      </>
    ),
    [activeSubTabId, onChangeSubTab]
  );

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
        </EuiTabs>
      </FlyoutHeader>
      <FlyoutBody
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        {selectedTabId === INSIGHTS_TAB_ID && insightsContent}
      </FlyoutBody>
    </>
  );
});

AttackDetailsLeftPanel.displayName = 'AttackDetailsLeftPanel';
