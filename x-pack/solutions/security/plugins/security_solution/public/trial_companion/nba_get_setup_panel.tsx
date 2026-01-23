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
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
  onDismiss: () => void;
}

export interface YourTrialCompanionTODOItemProps {
  item: NBATODOItem;
  completed: Milestone[];
  setExpandedItemId: (id: Milestone | null) => void;
  trigger: 'open' | 'closed';
  key: Key;
}

function buttonContent(completed: number, total: number) {
  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.trialNotifications.yourTrialCompanion.title"
            defaultMessage="Get set up"
          />
        </h4>
      </EuiTitle>
      <FormattedMessage
        id="xpack.securitySolution.trialNotifications.yourTrialCompanion.stepsCompleted"
        defaultMessage="{completed}/{total} steps completed"
        values={{ completed, total }}
      />
      <EuiProgress value={completed} max={total} size="m" />
    </>
  );
}

function itemButtonContent(iconType: string, color: string, title: string, milestoneId: Milestone) {
  return (
    <div>
      <EuiTitle size="xs" css={{ fontWeight: 'normal' }}>
        <div>
          <EuiIcon
            type={iconType}
            size="m"
            color={color}
            data-test-subj={`${TEST_SUBJ_PREFIX}-item-icon-${milestoneId}`}
          />
          &nbsp;
          <FormattedMessage
            id="xpack.securitySolution.trialNotifications.yourTrialCompanion.item.title"
            defaultMessage="{title}"
            values={{ title }}
          />
        </div>
      </EuiTitle>
    </div>
  );
}

export const YourTrialCompanionTODOItem: React.FC<YourTrialCompanionTODOItemProps> = ({
  item,
  completed,
  setExpandedItemId,
  trigger,
}) => {
  const { ...startServices } = useKibana().services;
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
      startServices.application.navigateToApp(action.app);
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
      <EuiSpacer size="s" />
      <EuiAccordion
        id={accordionId}
        buttonContent={itemButtonContent(iconType, color, item.translate.title, item.milestoneId)}
        arrowDisplay="right"
        borders={trigger === 'open' ? 'horizontal' : 'none'}
        buttonProps={{ paddingSize: 's' }}
        paddingSize="s"
        onToggle={onToggle}
        forceState={trigger}
        data-test-subj={`${TEST_SUBJ_PREFIX}-item-${item.milestoneId}`}
        key={item.milestoneId}
      >
        <EuiSpacer size="s" />
        <FormattedMessage
          id="xpack.securitySolution.trialNotifications.trialNotification.message"
          defaultMessage="{message}"
          values={{ message: item.translate.message }}
        />
        {action && viewButtonText && (
          <>
            <EuiSpacer size="s" />
            <EuiButton size="s" onClick={onViewButton} fill={true}>
              <FormattedMessage
                id="xpack.securitySolution.trialNotifications.trialNotification.viewButton"
                defaultMessage="{viewButtonText}"
                values={{ viewButtonText }}
              />
            </EuiButton>
          </>
        )}
      </EuiAccordion>
    </>
  );
};

function completedTODOs(todoList: NBATODOItem[], open: Milestone[]): Milestone[] {
  return todoList
    .map((item) => item.milestoneId)
    .filter((milestoneId) => !open.includes(milestoneId));
}

export const YourTrialCompanion: React.FC<YourTrialCompanionProps> = ({
  open,
  todoItems,
  onDismiss,
}: YourTrialCompanionProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'yourTrialCompanionAccordion' });
  const { euiTheme } = useEuiTheme();
  const completed = completedTODOs(todoItems, open);
  const showDismiss = difference(open, completed).length === 0;
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
  });
  const [isVisible, setIsVisible] = useState(true);
  const onDismissButton = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    isVisible && (
      <EuiPanel css={styles}>
        <EuiAccordion
          id={accordionId}
          buttonContent={buttonContent(completed.length, todoItems.length)}
          arrowDisplay="right"
          paddingSize="s"
          data-test-subj={GET_SET_UP_ACCORDION_TEST_ID}
        >
          {todoItems.map((item) => {
            return (
              <YourTrialCompanionTODOItem
                key={item.milestoneId}
                item={item}
                completed={completed}
                setExpandedItemId={setExpandedItemId}
                trigger={expandedItemId === item.milestoneId ? 'open' : 'closed'}
              />
            );
          })}
          {!showDismiss && (
            <EuiFlexGroup alignItems={'center'} direction={'column'} justifyContent="spaceAround">
              <EuiFlexItem grow={false}>
                <EuiSpacer size="s" />
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => {
                    setIsVisible(false);
                  }}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.trialNotifications.yourTrialCompanion.hideMe"
                    defaultMessage="Hide Me"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {showDismiss && (
            <>
              <EuiHorizontalRule margin="xs" />
              <EuiFlexGroup alignItems={'center'} direction={'column'}>
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
