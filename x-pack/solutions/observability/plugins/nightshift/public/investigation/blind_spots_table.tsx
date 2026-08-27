/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { EuiHorizontalRule, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import { InvestigationItemChatButton } from './investigation_item_chat_button';
import { InvestigationFormattedText } from './investigation_formatted_text';
import { InvestigationRowHoverAction } from './investigation_row_hover_action';
import { buildBlindSpotChatOptions } from './open_investigation_item_in_chat';
import { formatBlindSpotMarkdown, type BlindSpotItem } from './investigation_presentation';
import { NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { nightshiftBackgroundTransition } from '../common/transition';

const blindSpotChatTooltip = i18n.translate('xpack.nightshift.investigation.blindSpotChatTooltip', {
  defaultMessage: 'Ask agent about this blind spot',
});

export interface BlindSpotsTableProps {
  items: BlindSpotItem[];
  showTitle?: boolean;
  testSubj?: string;
  bodyFontSize?: string;
  chatAttachmentIdPrefix?: string;
}

export function BlindSpotsTable({
  items,
  showTitle = false,
  testSubj = 'nightshiftBlindSpotsTable',
  bodyFontSize,
  chatAttachmentIdPrefix = 'nightshift-blind-spot',
}: BlindSpotsTableProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;

  const openBlindSpotInChat = useCallback(
    (blindSpot: BlindSpotItem, index: number) => {
      agentBuilder?.openChat(
        buildBlindSpotChatOptions(blindSpot, `${chatAttachmentIdPrefix}-${index}`)
      );
    },
    [agentBuilder, chatAttachmentIdPrefix]
  );

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj={testSubj}>
      {showTitle && (
        <>
          <div
            css={css`
              padding: ${euiTheme.size.m};
            `}
          >
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.nightshift.investigation.blindSpotsTitle', {
                  defaultMessage: 'Blind spots',
                })}
              </h4>
            </EuiTitle>
          </div>
          <EuiHorizontalRule margin="none" />
        </>
      )}
      <ul
        css={css`
          list-style: none;
          margin: 0;
          padding: 0;
        `}
      >
        {items.map((item, index) => (
          <li
            key={`${item.title}-${item.description}`}
            data-test-subj={`${testSubj}Row-${index}`}
            css={css`
              ${index < items.length - 1 ? `border-bottom: ${euiTheme.border.thin};` : ''}
            `}
          >
            <div
              css={css`
                padding: ${euiTheme.size.m};
                transition: ${nightshiftBackgroundTransition(euiTheme)};

                &:hover,
                &:focus-within {
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                }
              `}
            >
              <InvestigationRowHoverAction
                action={
                  <InvestigationItemChatButton
                    ebtElement={NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATION_FLYOUT}
                    tooltip={blindSpotChatTooltip}
                    testSubj={`${testSubj}ChatButton-${index}`}
                    onClick={() => openBlindSpotInChat(item, index)}
                  />
                }
              >
                <InvestigationFormattedText
                  text={formatBlindSpotMarkdown(item)}
                  fontSize={bodyFontSize}
                />
              </InvestigationRowHoverAction>
            </div>
          </li>
        ))}
      </ul>
    </EuiPanel>
  );
}
