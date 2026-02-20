/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Key } from 'react';
import React, { useState } from 'react';
import { difference } from 'lodash';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiProgress,
  EuiTitle,
  EuiAccordion,
  useGeneratedHtmlId,
  useEuiTheme,
  EuiIcon,
  EuiSpacer,
  EuiButton,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui-theme-common';
import { postNBADismiss } from './api';
import { TrialCompanionEventTypes } from '../common/lib/telemetry/events/trial_companion/types';
import { useKibana } from '../common/lib/kibana';
import type { Milestone } from '../../common/trial_companion/types';
import type { NBAAction, NBATODOItem } from './nba_translations';
import RadioCircleIconSVG from './radio_circle_icon.svg';

export const TEST_SUBJ_PREFIX = 'securitySolutionYourTrialCompanion';
export const GET_SET_UP_ACCORDION_TEST_ID = `${TEST_SUBJ_PREFIX}-get-set-up-accordion`;
export const GET_SET_UP_DISMISS_BUTTON_TEST_ID = `${TEST_SUBJ_PREFIX}-get-set-up-dismiss-button`;

export interface YourTrialCompanionProps {
  open: Milestone[];
  todoItems: NBATODOItem[];
}

export interface YourTrialCompanionTODOItemProps {
  item: NBATODOItem;
  completed: Milestone[];
  setExpandedItemId: (id: Milestone | null) => void;
  trigger: 'open' | 'closed';
  key: Key;
  showTopBorder: boolean;
  showBottomBorder: boolean;
}

function buttonContent(completed: number, total: number, euiTheme: EuiThemeComputed) {
  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.trialNotifications.yourTrialCompanion.title"
            defaultMessage="Get set up"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer css={css({ blockSize: euiTheme.size.m })} />
      <FormattedMessage
        id="xpack.securitySolution.trialNotifications.yourTrialCompanion.stepsCompleted"
        defaultMessage="{completed}/{total} steps completed"
        values={{ completed, total }}
      />
      <EuiSpacer size="s" />
      <EuiProgress value={completed} max={total} size="m" />
    </>
  );
}

function itemButtonContent(iconType: string, color: string, title: string, milestoneId: Milestone) {
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={iconType}
          size="m"
          color={color}
          data-test-subj={`${TEST_SUBJ_PREFIX}-item-icon-${milestoneId}`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="m">
          <FormattedMessage
            id="xpack.securitySolution.trialNotifications.yourTrialCompanion.item.title"
            defaultMessage="{title}"
            values={{ title }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const YourTrialCompanionTODOItem: React.FC<YourTrialCompanionTODOItemProps> = ({
  item,
  completed,
  setExpandedItemId,
  trigger,
  showTopBorder,
  showBottomBorder,
}) => {
  const { analytics, application } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const iconType = completed.includes(item.milestoneId)
    ? 'checkInCircleFilled'
    : RadioCircleIconSVG;
  const color = completed.includes(item.milestoneId) ? 'success' : 'default';
  const accordionId = useGeneratedHtmlId({
    prefix: 'yourTrialCompanionAccordionTODOItem',
    suffix: item.milestoneId.toString(),
  });
  const action: NBAAction | undefined = item.translate.apps?.[0];
  const viewButtonText = action?.text;
  const onViewButton = () => {
    if (action) {
      analytics?.reportEvent(TrialCompanionEventTypes.ViewButtonClicked, {
        app: action.app,
      });
      application.navigateToApp(action.app);
    }
  };
  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setExpandedItemId(item.milestoneId);
    } else {
      setExpandedItemId(null);
    }
  };

  return (
    <>
      {showTopBorder && trigger === 'open' && <EuiHorizontalRule margin="none" />}
      <EuiAccordion
        id={accordionId}
        buttonContent={itemButtonContent(iconType, color, item.translate.title, item.milestoneId)}
        buttonProps={{ css: css({ '&:hover': { textDecoration: 'none' } }) }}
        arrowDisplay="right"
        onToggle={onToggle}
        forceState={trigger}
        data-test-subj={`${TEST_SUBJ_PREFIX}-item-${item.milestoneId}`}
        key={item.milestoneId}
        css={css({
          '&.euiAccordion-isOpen': {
            paddingBottom: euiTheme.size.m,
            paddingTop: euiTheme.size.m,
          },
        })}
        element="fieldset"
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup
          responsive={false}
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="m"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="empty" size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              responsive={false}
              direction="column"
              gutterSize="m"
              justifyContent="flexStart"
              alignItems="flexStart"
            >
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.securitySolution.trialNotifications.trialNotification.message"
                  defaultMessage="{message}"
                  values={{ message: item.translate.message }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {action && viewButtonText && (
                  <EuiButton size="s" onClick={onViewButton} fill={true} fullWidth={false}>
                    <FormattedMessage
                      id="xpack.securitySolution.trialNotifications.trialNotification.viewButton"
                      defaultMessage="{viewButtonText}"
                      values={{ viewButtonText }}
                    />
                  </EuiButton>
                )}
                <EuiSpacer size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="empty" size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
      {showBottomBorder && trigger === 'open' && <EuiHorizontalRule margin="none" />}
    </>
  );
};

export function completedTODOs(todoList: NBATODOItem[], open: Milestone[]): Milestone[] {
  return todoList
    .map((item) => item.milestoneId)
    .filter((milestoneId) => !open.includes(milestoneId));
}

export function openTODOs(todoItems: NBATODOItem[], completed: Milestone[]): Milestone[] {
  return difference(
    todoItems.map((v) => v.milestoneId),
    completed
  );
}

export const YourTrialCompanion: React.FC<YourTrialCompanionProps> = ({
  open,
  todoItems,
}: YourTrialCompanionProps) => {
  const { analytics } = useKibana().services;
  const accordionId = useGeneratedHtmlId({ prefix: 'yourTrialCompanionAccordion' });
  const { euiTheme } = useEuiTheme();
  const completed = completedTODOs(todoItems, open);
  const showDismiss = openTODOs(todoItems, completed).length === 0;
  const [expandedItemId, setExpandedItemId] = useState<Milestone | null>(null);
  const styles = css({
    zIndex: euiTheme.levels.header,
    position: 'fixed',
    bottom: '5%',
    maxWidth: '400px',
    left: `calc(var(--kbn-layout--navigation-width) + ${euiTheme.size.base})`,
    '.euiAccordion__buttonContent': {
      width: '100%;',
    },
    paddingTop: euiTheme.size.base,
    paddingBottom: euiTheme.size.l,
  });
  const firstLineSelected = expandedItemId === todoItems[0].milestoneId;
  const lastLineSelected = expandedItemId === todoItems[todoItems.length - 1].milestoneId;

  const [isVisible, setIsVisible] = useState(true);
  const onDismissButton = () => {
    setIsVisible(false);
    analytics?.reportEvent(TrialCompanionEventTypes.DismissButtonClicked, {});
    postNBADismiss();
  };

  return (
    isVisible && (
      <EuiPanel css={styles}>
        <EuiAccordion
          id={accordionId}
          buttonContent={buttonContent(completed.length, todoItems.length, euiTheme)}
          buttonProps={{ css: css({ '&:hover': { textDecoration: 'none' } }) }}
          arrowProps={{ css: css({ alignSelf: 'flex-start', marginTop: '0rem' }) }}
          arrowDisplay="right"
          paddingSize="none"
          css={{
            gap: euiTheme.size.m,
          }}
          data-test-subj={GET_SET_UP_ACCORDION_TEST_ID}
          element="fieldset"
        >
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems={'center'} direction={'column'} css={{ gap: euiTheme.size.m }}>
            {todoItems.map((item) => {
              return (
                <EuiFlexItem key={item.milestoneId}>
                  <YourTrialCompanionTODOItem
                    key={item.milestoneId}
                    item={item}
                    completed={completed}
                    setExpandedItemId={setExpandedItemId}
                    trigger={expandedItemId === item.milestoneId ? 'open' : 'closed'}
                    showTopBorder={!firstLineSelected}
                    showBottomBorder={!lastLineSelected}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          {showDismiss && (
            <>
              {!lastLineSelected && <EuiSpacer css={css({ blockSize: euiTheme.size.m })} />}
              <EuiHorizontalRule margin="none" />
              <EuiSpacer css={css({ blockSize: euiTheme.size.l })} />
              <EuiFlexGroup alignItems={'center'} direction={'column'} gutterSize="s">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.trialNotifications.yourTrialCompanion.dismiss.allStepsCompleted"
                    defaultMessage="All steps complete!"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    fill={true}
                    onClick={onDismissButton}
                    color={'primary'}
                    data-test-subj={GET_SET_UP_DISMISS_BUTTON_TEST_ID}
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.trialNotifications.yourTrialCompanion.dismiss"
                      defaultMessage="Dismiss"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiAccordion>
      </EuiPanel>
    )
  );
};
