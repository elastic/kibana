/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiPanel,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { useNavigation } from '../../../../../../common/lib/kibana';
import { SecurityPageName } from '../../../../../../../common/constants';
import * as i18n from './translations';

export const WorkflowMigrationCard: OnboardingCardComponent = () => {
  const { navigateTo } = useNavigation();

  const onOpenTranslatedWorkflows = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.siemMigrationsWorkflows });
  }, [navigateTo]);

  return (
    <OnboardingCardContentPanel>
      <EuiPanel color="subdued" paddingSize="m" hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <AssistantIcon />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{i18n.NEED_MORE_WORKFLOWS_TITLE}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => {}}>
              {i18n.UPLOAD_MORE_WORKFLOWS} <EuiIcon type="importAction" aria-hidden={true} />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.TINES_BADGE}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{i18n.READY_MIGRATION_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
                  <EuiButtonIcon iconType="boxesVertical" aria-label={i18n.MORE_ACTIONS} />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.READY_MIGRATION_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="importAction" onClick={() => {}}>
                  {i18n.UPLOAD}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={() => {}}>
                  {i18n.START}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.TINES_BADGE}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{i18n.COMPLETE_MIGRATION_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
                  <EuiButtonIcon iconType="boxesVertical" aria-label={i18n.MORE_ACTIONS} />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.COMPLETE_MIGRATION_DESCRIPTION}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.TOTAL_EXECUTION_TIME}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="success">
                  <strong>{i18n.TRANSLATION_COMPLETE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.TRANSLATION_COMPLETE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="arrowRight"
                    aria-label={i18n.TRANSLATION_COMPLETE}
                    onClick={onOpenTranslatedWorkflows}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </OnboardingCardContentPanel>
  );
};
WorkflowMigrationCard.displayName = 'WorkflowMigrationCard';

// eslint-disable-next-line import/no-default-export
export default WorkflowMigrationCard;
