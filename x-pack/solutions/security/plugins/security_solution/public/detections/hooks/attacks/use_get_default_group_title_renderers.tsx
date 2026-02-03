/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSkeletonLoading, EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import type { GroupPanelRenderer, RawBucket } from '@kbn/grouping/src';

import type { AlertsGroupingAggregation } from '../../components/alerts_table/grouping_settings/types';
import { AttackGroupContent } from '../../components/attacks/table/attack_group_content';
import type { AttackForGroup } from './use_attack_group_handler';

export const ATTACK_GROUP_LOADING_SPINNER_TEST_ID = 'attack-group-loading-spinner';

/**
 * Props for the useGetDefaultGroupTitleRenderers hook
 */
export interface UseGetDefaultGroupTitleRenderersProps {
  /** When true, displays anonymized values in attack titles and summaries. When false, replaces anonymized values with their original values. Defaults to false. */
  showAnonymized?: boolean;

  /** Helper function to retrieve attack details for a specific grouping bucket */
  getAttack: AttackForGroup;

  /** Indicates if the attack data is currently loading */
  isLoading?: boolean;

  /** Helper function to open the flyout */
  openAttackDetailsFlyout: (
    selectedGroup: string,
    bucket: RawBucket<AlertsGroupingAggregation>
  ) => void;
}

/**
 * Returns a renderer function for individual group component rendering.
 * This hook handles the loading state and uses the provided `getAttack` helper
 * to retrieve the attack data for rendering the group title content.
 *
 * @param props - The hook props
 * @param props.getAttack - Helper function to retrieve attack details
 * @param props.showAnonymized - When true, displays anonymized values; when false, displays original values
 * @param props.isLoading - Indicates if the attack data is currently loading
 * @param props.openAttackDetailsFlyout - Helper function to open the flyout
 * @returns An object containing the defaultGroupTitleRenderers function for rendering group titles
 */
export const useGetDefaultGroupTitleRenderers = ({
  getAttack,
  showAnonymized,
  isLoading = false,
  openAttackDetailsFlyout,
}: UseGetDefaultGroupTitleRenderersProps) => {
  const defaultGroupTitleRenderers: GroupPanelRenderer<AlertsGroupingAggregation> = useCallback(
    (selectedGroup, bucket) => {
      const attack = getAttack(selectedGroup, bucket);

      // Fall back to the internal Grouping renderer if attacks data has been loaded
      // and there is no attack for the selected group
      if (!isLoading && !attack) {
        return undefined;
      }

      return (
        <EuiSkeletonLoading
          isLoading={isLoading}
          loadingContent={
            <div data-test-subj={ATTACK_GROUP_LOADING_SPINNER_TEST_ID}>
              <EuiSkeletonRectangle height={16} width="50%" />
              <EuiSpacer size="s" />
              <EuiSkeletonRectangle height={16} width="100%" />
            </div>
          }
          loadedContent={
            <>
              {attack && (
                <AttackGroupContent
                  attack={attack}
                  dataTestSubj="attack"
                  showAnonymized={showAnonymized}
                  openAttackDetailsFlyout={() => openAttackDetailsFlyout(selectedGroup, bucket)}
                />
              )}
            </>
          }
        />
      );
    },
    [getAttack, showAnonymized, isLoading, openAttackDetailsFlyout]
  );

  return { defaultGroupTitleRenderers };
};
