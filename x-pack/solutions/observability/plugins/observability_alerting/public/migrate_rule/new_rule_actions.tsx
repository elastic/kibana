/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiSplitButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface NewRuleActionsProps {
  onCreate: () => void;
  onCustomize: () => void;
  isCreating: boolean;
  /** Creating is disabled when there is no converted rule to save. */
  canCreate: boolean;
  /** Set once the rule is created; replaces the create and customize actions. */
  onView?: () => void;
}

export const NewRuleActions = ({
  onCreate,
  onCustomize,
  onView,
  isCreating,
  canCreate,
}: NewRuleActionsProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'migrateRuleNewRuleActions' });
  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const handleCustomize = useCallback(() => {
    setIsMenuOpen(false);
    onCustomize();
  }, [onCustomize]);

  if (onView) {
    return (
      <EuiButton
        size="s"
        fill
        iconType="eye"
        onClick={onView}
        data-test-subj="migrateRuleViewNewRule"
      >
        {i18n.translate('xpack.observabilityAlerting.migrateRule.newRuleActions.view', {
          defaultMessage: 'View rule',
        })}
      </EuiButton>
    );
  }

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.translate(
        'xpack.observabilityAlerting.migrateRule.newRuleActions.menuAriaLabel',
        { defaultMessage: 'New rule actions' }
      )}
      isOpen={isMenuOpen}
      closePopover={closeMenu}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiSplitButton size="s" fill data-test-subj="migrateRuleNewRuleActions">
          <EuiSplitButton.ActionPrimary
            onClick={onCreate}
            isLoading={isCreating}
            isDisabled={!canCreate || isCreating}
            data-test-subj="migrateRuleCreateNewRule"
          >
            {i18n.translate('xpack.observabilityAlerting.migrateRule.newRuleActions.create', {
              defaultMessage: 'Create rule',
            })}
          </EuiSplitButton.ActionPrimary>
          <EuiSplitButton.ActionSecondary
            iconType="chevronSingleDown"
            onClick={toggleMenu}
            isDisabled={isCreating}
            aria-label={i18n.translate(
              'xpack.observabilityAlerting.migrateRule.newRuleActions.moreActions',
              { defaultMessage: 'More actions' }
            )}
            aria-haspopup="menu"
            aria-controls={popoverId}
            data-test-subj="migrateRuleNewRuleMoreActions"
          />
        </EuiSplitButton>
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="customize"
            icon="pencil"
            onClick={handleCustomize}
            data-test-subj="migrateRuleCustomizeNewRule"
          >
            {i18n.translate('xpack.observabilityAlerting.migrateRule.newRuleActions.customize', {
              defaultMessage: 'Customize',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
