/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscovery,
  AttackDiscoveryAlert,
  Replacements,
} from '@kbn/elastic-assistant-common';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  useGeneratedHtmlId,
  EuiPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { getAttackDiscoveryMarkdown } from '../attack_discovery_panel/get_attack_discovery_markdown/get_attack_discovery_markdown';
import { useAddToNewCase } from './use_add_to_case';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useViewInAiAssistant } from '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../../use_kibana_feature_flags';

interface Props {
  attackDiscoveries: AttackDiscovery[] | AttackDiscoveryAlert[];
  buttonText?: string;
  buttonSize?: 's' | 'xs';
  replacements?: Replacements;
}

const TakeActionComponent: React.FC<Props> = ({
  attackDiscoveries,
  buttonSize = 's',
  buttonText,
  replacements,
}) => {
  const {
    services: { cases },
  } = useKibana();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.createComment && userCasesPermissions.read,
    [userCasesPermissions.createComment, userCasesPermissions.read]
  );
  const { disabled: addToCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    title: attackDiscoveries.map((discovery) => discovery.title).join(', '),
  });
  const { onAddToExistingCase } = useAddToExistingCase({
    canUserCreateAndReadCases,
  });

  // boilerplate for the take action popover:
  const takeActionContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'takeActionContextMenuPopover',
  });
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => setPopover(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setPopover(false), []);

  // markdown for the attack discovery, which will be exported to the case, or to the assistant:
  const markdown = useMemo(
    () =>
      attackDiscoveries
        .map((attackDiscovery) =>
          getAttackDiscoveryMarkdown({
            attackDiscovery,
            replacements,
          })
        )
        .join('\n\n'),
    [attackDiscoveries, replacements]
  );

  const alertIds = useMemo(
    () => [...new Set(attackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds))],
    [attackDiscoveries]
  );

  // click handlers for the popover actions:
  const onClickAddToNewCase = useCallback(() => {
    closePopover();

    onAddToNewCase({
      alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [closePopover, onAddToNewCase, alertIds, markdown, replacements]);

  const onClickAddToExistingCase = useCallback(() => {
    closePopover();

    onAddToExistingCase({
      alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [closePopover, onAddToExistingCase, alertIds, markdown, replacements]);

  const { showAssistantOverlay, disabled: viewInAiAssistantDisabled } = useViewInAiAssistant({
    attackDiscovery: attackDiscoveries[0],
    replacements,
  });

  const onViewInAiAssistant = useCallback(() => {
    closePopover();
    showAssistantOverlay?.();
  }, [closePopover, showAssistantOverlay]);

  // button for the popover:
  const button = useMemo(
    () => (
      <EuiButtonEmpty
        data-test-subj="takeActionPopoverButton"
        iconSide="right"
        iconType="arrowDown"
        onClick={onButtonClick}
        size={buttonSize}
      >
        {buttonText ?? i18n.TAKE_ACTION}
      </EuiButtonEmpty>
    ),
    [buttonSize, buttonText, onButtonClick]
  );

  // items for the popover:
  const items: React.JSX.Element[] = useMemo(
    () =>
      [
        <EuiContextMenuItem
          data-test-subj="addToCase"
          disabled={addToCaseDisabled}
          key="addToCase"
          onClick={onClickAddToNewCase}
        >
          {i18n.ADD_TO_NEW_CASE}
        </EuiContextMenuItem>,

        <EuiContextMenuItem
          data-test-subj="addToExistingCase"
          disabled={addToCaseDisabled}
          key="addToExistingCase"
          onClick={onClickAddToExistingCase}
        >
          {i18n.ADD_TO_EXISTING_CASE}
        </EuiContextMenuItem>,

        attackDiscoveries.length === 1 ? (
          <EuiContextMenuItem
            data-test-subj="viewInAiAssistant"
            disabled={viewInAiAssistantDisabled}
            key="viewInAiAssistant"
            onClick={onViewInAiAssistant}
          >
            {i18n.VIEW_IN_AI_ASSISTANT}
          </EuiContextMenuItem>
        ) : (
          []
        ),
      ].flat(),
    [
      addToCaseDisabled,
      attackDiscoveries.length,
      onClickAddToExistingCase,
      onClickAddToNewCase,
      onViewInAiAssistant,
      viewInAiAssistantDisabled,
    ]
  );

  const allItems = useMemo(
    () =>
      attackDiscoveryAlertsEnabled
        ? [
            <EuiContextMenuItem
              data-test-subj="markAsAcknowledged"
              disabled={true}
              key="markAsAcknowledged"
              onClick={() => {}}
            >
              {i18n.MARK_AS_ACKNOWLEDGED}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              data-test-subj="markAsClosed"
              disabled={true}
              key="markAsClosed"
              onClick={() => {}}
            >
              {i18n.MARK_AS_CLOSED}
            </EuiContextMenuItem>,
            ...items,
          ]
        : items,
    [attackDiscoveryAlertsEnabled, items]
  );

  return (
    <EuiPopover
      anchorPosition="downCenter"
      button={button}
      closePopover={closePopover}
      data-test-subj="takeAction"
      id={takeActionContextMenuPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={allItems} />
    </EuiPopover>
  );
};

TakeActionComponent.displayName = 'TakeAction';

export const TakeAction = React.memo(TakeActionComponent);
