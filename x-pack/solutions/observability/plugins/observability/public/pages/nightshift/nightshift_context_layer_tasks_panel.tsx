/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ContextLayerTask {
  id: string;
  label: string;
}

const CONTEXT_LAYER_TASKS: ContextLayerTask[] = [
  {
    id: 'code',
    label: i18n.translate('xpack.observability.nightshift.contextLayerTasks.codeConnect', {
      defaultMessage: 'Code connect',
    }),
  },
  {
    id: 'wiki',
    label: i18n.translate('xpack.observability.nightshift.contextLayerTasks.wikiConnect', {
      defaultMessage: 'Wiki connect',
    }),
  },
  {
    id: 'conversations',
    label: i18n.translate('xpack.observability.nightshift.contextLayerTasks.conversationsConnect', {
      defaultMessage: 'Conversations connect',
    }),
  },
];

export interface NightshiftContextLayerTasksPanelProps {
  isExiting?: boolean;
}

/**
 * "Context layer tasks" panel — connector rows with Connect actions.
 * Matches the workflow summary panel on the Loading page (Figma 887:74247).
 */
export const NightshiftContextLayerTasksPanel: React.FC<NightshiftContextLayerTasksPanelProps> = ({
  isExiting = false,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        width: 100%;
      `}
      data-test-subj="nightshiftContextLayerTasks"
    >
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        color="plain"
        css={css`
          overflow: hidden;
          border-radius: 12px;
          border-color: ${euiTheme.colors.borderBaseSubdued};
        `}
      >
        <div
          css={css`
            padding: ${euiTheme.size.base};
            background: ${euiTheme.colors.backgroundBasePlain};
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <div
                    aria-hidden
                    css={css`
                      width: 24px;
                      height: 24px;
                      border-radius: 12px;
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                    `}
                  >
                    <EuiIcon type="plugs" size="s" color={euiTheme.colors.textSubdued} />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('xpack.observability.nightshift.contextLayerTasks.title', {
                        defaultMessage: 'Context layer tasks',
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    color="text"
                    data-test-subj="nightshiftContextLayerOpenDetails"
                    isDisabled={isExiting}
                    onClick={() => {}}
                  >
                    {i18n.translate('xpack.observability.nightshift.contextLayerTasks.openDetails', {
                      defaultMessage: 'Open details',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="boxesHorizontal"
                    color="text"
                    size="s"
                    aria-label={i18n.translate(
                      'xpack.observability.nightshift.contextLayerTasks.moreAriaLabel',
                      { defaultMessage: 'More actions for context layer tasks' }
                    )}
                    isDisabled={isExiting}
                    onClick={() => {}}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {CONTEXT_LAYER_TASKS.map((task, idx) => {
          const isLast = idx === CONTEXT_LAYER_TASKS.length - 1;
          return (
            <div
              key={task.id}
              css={css`
                padding: ${euiTheme.size.s} ${euiTheme.size.base};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
              `}
              data-test-subj={`nightshiftContextLayerTask-${task.id}`}
            >
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                responsive={false}
                gutterSize="s"
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type="chevronSingleRight"
                        size="s"
                        color="subdued"
                        aria-hidden
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <strong>{task.label}</strong>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    data-test-subj={`nightshiftContextLayerTask-${task.id}-connect`}
                    isDisabled={isExiting}
                    onClick={() => {}}
                  >
                    {i18n.translate('xpack.observability.nightshift.contextLayerTasks.connect', {
                      defaultMessage: 'Connect',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          );
        })}

        <div
          css={css`
            padding: ${euiTheme.size.base};
            background: ${euiTheme.colors.backgroundBasePlain};
            border-top: ${euiTheme.border.thin};
          `}
        >
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.observability.nightshift.contextLayerTasks.footer', {
                defaultMessage:
                  'In order to make your experience seamless with Nightshift we recommend to share more context with Elastic via our connectors.',
              })}
            </p>
          </EuiText>
        </div>
      </EuiPanel>
    </EuiFlexItem>
  );
};
