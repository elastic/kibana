/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { useAttackDetails } from '../../../flyout/attack_details/hooks/use_attack_details';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { AttackFlyout } from '.';

const FETCH_ERROR = i18n.translate('xpack.securitySolution.flyoutV2.attack.wrapper.fetchError', {
  defaultMessage: 'Unable to fetch attack document.',
});

export interface AttackFlyoutWrapperProps {
  /**
   * The ID of the attack document to display.
   */
  attackId: string;
  /**
   * The name of the index that contains the attack document.
   */
  indexName: string;
  /**
   * Callback invoked after attack mutations to refresh related views (e.g. the
   * surface that opened the flyout). The wrapper additionally refetches the
   * attack document so the flyout itself reflects the mutation without the user
   * having to close and re-open it.
   */
  onAttackUpdated: () => void;
  /**
   * Renderer for cell actions in nested alert flyouts opened from attack tools.
   */
  renderCellActions?: CellActionRenderer;
}

/**
 * Wrapper for AttackFlyout that owns the single fetch of the attack document
 * for the v2 flyout. It builds the `hit` and resolves the `attack` from the
 * same fetched search hit, and exposes a refreshing `onAttackUpdated` callback
 * to children so that any in-flyout mutation (status, assignees, tags, ...)
 * is reflected without re-opening the flyout.
 */
export const AttackFlyoutWrapper = memo(
  ({ attackId, indexName, onAttackUpdated, renderCellActions }: AttackFlyoutWrapperProps) => {
    const { dataView, status } = useDataView(PageScope.default);
    const { loading, searchHit, attack, refetch } = useAttackDetails({ attackId, indexName });

    const isDataViewLoading = status === 'loading' || status === 'pristine';
    const isDataViewInvalid =
      status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());

    const hit = useMemo(
      () => (searchHit ? buildDataTableRecord(searchHit as EsHitRecord) : null),
      [searchHit]
    );

    const handleAttackUpdated = useCallback(() => {
      onAttackUpdated();
      refetch();
    }, [onAttackUpdated, refetch]);

    if ((isDataViewLoading || loading) && !hit) {
      return <FlyoutLoading data-test-subj="attack-flyout-wrapper-loading" />;
    }

    if (isDataViewInvalid || !hit || !attack) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={FETCH_ERROR}
          data-test-subj="attack-flyout-wrapper-error"
        />
      );
    }

    return (
      <AttackFlyout
        hit={hit}
        attack={attack}
        dataView={dataView}
        onAttackUpdated={handleAttackUpdated}
        renderCellActions={renderCellActions}
      />
    );
  }
);

AttackFlyoutWrapper.displayName = 'AttackFlyoutWrapper';
