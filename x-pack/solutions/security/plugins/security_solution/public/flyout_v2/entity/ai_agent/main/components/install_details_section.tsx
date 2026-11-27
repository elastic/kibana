/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { AgentRow } from '../../../../../entity_analytics/components/ai_security/types';
import { ONE_WEEK_IN_HOURS } from '../../../shared/constants';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  COPY_ENTITY_ID,
  ENTITY_ID_LABEL,
  FIRST_SEEN_LABEL,
  INSTALL_DETAILS_TITLE,
  VERSION_LABEL,
} from '../translations';

export interface InstallDetailsSectionProps {
  readonly entityId: string;
  readonly agent?: AgentRow;
}

/** Version, first seen and the entity ID of the install, collapsed by default. */
export const InstallDetailsSection = memo(({ entityId, agent }: InstallDetailsSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'aiAgentInstallDetails' });

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={false}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{INSTALL_DETAILS_TITLE}</h3>
        </EuiTitle>
      }
      buttonProps={{
        'data-test-subj': AI_AGENT_TEST_IDS.installDetailsToggle,
        css: css`
          color: ${euiTheme.colors.primary};
        `,
      }}
      data-test-subj={AI_AGENT_TEST_IDS.installDetails}
    >
      <EuiSpacer size="s" />
      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[1, 3]}
        listItems={[
          { title: VERSION_LABEL, description: agent?.version ?? getEmptyTagValue() },
          {
            title: FIRST_SEEN_LABEL,
            description: agent?.firstSeen ? (
              <FormattedRelativePreferenceDate
                value={agent.firstSeen}
                relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
              />
            ) : (
              getEmptyTagValue()
            ),
          },
          {
            title: ENTITY_ID_LABEL,
            description: (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText
                    size="xs"
                    css={css`
                      word-break: break-all;
                    `}
                  >
                    {entityId}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={entityId}>
                    {(copy) => (
                      <EuiToolTip content={COPY_ENTITY_ID} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="copy"
                          size="xs"
                          onClick={copy}
                          aria-label={COPY_ENTITY_ID}
                          data-test-subj={AI_AGENT_TEST_IDS.copyEntityId}
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
        ]}
      />
    </EuiAccordion>
  );
});
InstallDetailsSection.displayName = 'InstallDetailsSection';
