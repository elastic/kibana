/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { NotesDetails } from '../../shared/tools/notes';
import { useKibana } from '../../../common/lib/kibana';
import { Header } from './header';

const BODY_PLACEHOLDER = i18n.translate('xpack.securitySolution.flyoutV2.attack.body.placeholder', {
  defaultMessage: 'Attack details body',
});

const FOOTER_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.flyoutV2.attack.footer.placeholder',
  { defaultMessage: 'Attack details footer' }
);

export interface AttackFlyoutProps {
  /**
   * The attack document to display.
   */
  hit: DataTableRecord;
  /**
   * The attack discovery alert object resolved from the same fetch as `hit`.
   * Owned by `AttackFlyoutWrapper` so the flyout has a single source of truth.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback invoked after attack mutations (status change, assignee update, etc.).
   * Provided by `AttackFlyoutWrapper`; it refetches the attack document so the
   * flyout UI reflects the mutation without the user having to close and re-open it,
   * and notifies the surface that opened the flyout to refresh as well.
   */
  onAttackUpdated: () => void;
}

/**
 * Content for the v2 attack flyout. Receives a fully-resolved `hit` and `attack`
 * from `AttackFlyoutWrapper` (which owns the single data fetch) and renders the
 * header. Body and footer are wired in subsequent PRs; they currently render
 * placeholders.
 */
export const AttackFlyout = memo(({ hit, attack, onAttackUpdated }: AttackFlyoutProps) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();

  const onShowNotes = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      defaultToolsFlyoutProperties
    );
  }, [history, hit, overlays, services, store]);

  return (
    <>
      <EuiFlyoutHeader data-test-subj="attack-flyout-header">
        <Header hit={hit} onAttackUpdated={onAttackUpdated} onShowNotes={onShowNotes} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="attack-flyout-body">
        <EuiText>
          <p>{BODY_PLACEHOLDER}</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj="attack-flyout-footer">
        <EuiText>
          <p>{FOOTER_PLACEHOLDER}</p>
        </EuiText>
      </EuiFlyoutFooter>
    </>
  );
});

AttackFlyout.displayName = 'AttackFlyout';
