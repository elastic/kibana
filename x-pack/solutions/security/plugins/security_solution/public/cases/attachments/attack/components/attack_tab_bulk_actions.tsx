/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ATTACK_TAB_BULK_ACTIONS_TEST_ID,
  ATTACK_TAB_BULK_REMOVE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { APP_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import type { CaseAttachment } from '../utils';
import type { RemoveAttackConfirmation } from './connected_remove_attack_modal';
import { ConnectedRemoveAttackModal } from './connected_remove_attack_modal';

const REMOVE_FROM_CASE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.bulkRemoveButtonLabel',
  { defaultMessage: 'Remove from case' }
);

const getSelectedLabel = (attackCount: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectedAttacksLabel', {
    defaultMessage: '{attackCount, plural, one {# attack selected} other {# attacks selected}}',
    values: { attackCount },
  });

/** Names the whole selection in the removal prompt, where a single row names its attack. */
const getSelectionTitle = (attackCount: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectedAttacksTitle', {
    defaultMessage: '{attackCount, plural, one {# attack} other {# attacks}}',
    values: { attackCount },
  });

/** One selected row, reduced to what the removal needs. */
export interface SelectedAttack {
  /** The attack document `_id`, used to resolve the alerts the removal may take with it. */
  attackId: string;
  /** The attack title, shown in the prompt when the selection is a single row. */
  title: string;
}

export interface AttackTabBulkActionsProps {
  /** The selected rows. The bar renders nothing while this is empty. */
  selectedAttacks: readonly SelectedAttack[];
  /** The case's attachments, used to resolve which alerts the attacks may take with them. */
  comments: readonly CaseAttachment[];
  /** True while a removal is in flight, which disables the action. */
  isRemoving: boolean;
  /** Called once the user confirms. Nothing is removed until this runs. */
  onConfirm: (confirmation: RemoveAttackConfirmation) => void;
}

/**
 * The attacks grid's bulk action bar: a count of the selection and the one action it offers,
 * removing the selected attacks from the case.
 *
 * The removal itself is the caller's, which is what keeps the row action and this bar on the
 * same mutation — and so the same in-flight state.
 */
export const AttackTabBulkActions = ({
  selectedAttacks,
  comments,
  isRemoving,
  onConfirm,
}: AttackTabBulkActionsProps) => {
  const { cases } = useKibana().services;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const attackIds = useMemo(
    () => selectedAttacks.map(({ attackId }) => attackId),
    [selectedAttacks]
  );

  const canDelete = cases.helpers.canUseCases([APP_ID]).delete;

  if (selectedAttacks.length === 0 || !canDelete) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        data-test-subj={ATTACK_TAB_BULK_ACTIONS_TEST_ID}
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {getSelectedLabel(selectedAttacks.length)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="danger"
            data-test-subj={ATTACK_TAB_BULK_REMOVE_TEST_ID}
            iconType="trash"
            isDisabled={isRemoving}
            onClick={openModal}
            size="xs"
          >
            {REMOVE_FROM_CASE}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Mounted only while open so resolving the removable alerts costs a request per removal,
          not one for every change of selection. */}
      {isModalOpen ? (
        <ConnectedRemoveAttackModal
          attackIds={attackIds}
          attackTitle={
            selectedAttacks.length === 1
              ? selectedAttacks[0].title
              : getSelectionTitle(selectedAttacks.length)
          }
          comments={comments}
          onCancel={closeModal}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  );
};

AttackTabBulkActions.displayName = 'AttackTabBulkActions';
