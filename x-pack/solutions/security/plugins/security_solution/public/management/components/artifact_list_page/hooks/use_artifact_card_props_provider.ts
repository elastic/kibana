/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useCallback, useEffect, useMemo } from 'react';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { useBulkFetchFleetIntegrationPolicies } from '../../../hooks/policy/use_bulk_fetch_fleet_integration_policies';
import { getPolicyIdsFromArtifact } from '../../../../../common/endpoint/service/artifacts';
import type { AnyArtifact, ArtifactEntryCardProps } from '../../artifact_entry_card';
import { useEndpointPoliciesToArtifactPolicies } from '../../artifact_entry_card';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { getLoadPoliciesError } from '../../../common/translations';
import { useToasts } from '../../../../common/lib/kibana';

type CardActionType = 'edit' | 'delete';

export interface UseArtifactCardPropsProviderProps {
  items: ExceptionListItemSchema[];
  onAction: (action: { type: CardActionType; item: ExceptionListItemSchema }) => void;
  cardActionEditLabel: string;
  cardActionDeleteLabel: string;
  dataTestSubj?: string;
  allowCardEditAction?: boolean;
  allowCardDeleteAction?: boolean;
}

type ArtifactCardPropsProvider = (artifactItem: ExceptionListItemSchema) => ArtifactEntryCardProps;

/**
 * Return a function that can be used to retrieve props for an `ArtifactCardEntry` component given an
 * `ExceptionListItemSchema` on input
 */
export const useArtifactCardPropsProvider = ({
  items,
  onAction,
  cardActionDeleteLabel,
  cardActionEditLabel,
  dataTestSubj,
  allowCardDeleteAction = true,
  allowCardEditAction = true,
}: UseArtifactCardPropsProviderProps): ArtifactCardPropsProvider => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  const toasts = useToasts();

  const itemsPolicyIds = useMemo(() => {
    return items.map((item) => getPolicyIdsFromArtifact(item)).flat();
  }, [items]);

  const { data: policyData, error } = useBulkFetchFleetIntegrationPolicies<PolicyData>(
    { ids: itemsPolicyIds },
    { enabled: itemsPolicyIds.length > 0 }
  );

  const policies: ArtifactEntryCardProps['policies'] = useEndpointPoliciesToArtifactPolicies(
    policyData?.items
  );

  const artifactCardPropsPerItem = useMemo(() => {
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    // with common component's props
    for (const artifactItem of items as ExceptionListItemSchema[]) {
      const cardActions: ArtifactEntryCardProps['actions'] = [];

      if (allowCardEditAction) {
        cardActions.push({
          icon: 'controlsHorizontal',
          onClick: () => {
            onAction({ type: 'edit', item: artifactItem });
          },
          'data-test-subj': getTestId('cardEditAction'),
          children: cardActionEditLabel,
        });
      }

      if (allowCardDeleteAction) {
        cardActions.push({
          icon: 'trash',
          onClick: () => {
            onAction({ type: 'delete', item: artifactItem });
          },
          'data-test-subj': getTestId('cardDeleteAction'),
          children: cardActionDeleteLabel,
        });
      }

      cachedCardProps[artifactItem.id] = {
        item: artifactItem as AnyArtifact,
        policies,
        'data-test-subj': dataTestSubj,
        actions: cardActions.length > 0 ? cardActions : undefined,
        hideDescription: !artifactItem.description,
        hideComments: !artifactItem.comments.length,
      };
    }

    return cachedCardProps;
  }, [
    items,
    allowCardEditAction,
    allowCardDeleteAction,
    policies,
    dataTestSubj,
    getTestId,
    cardActionEditLabel,
    onAction,
    cardActionDeleteLabel,
  ]);

  useEffect(() => {
    if (error) {
      toasts.addDanger(getLoadPoliciesError(error));
    }
  }, [error, toasts]);

  return useCallback(
    (artifactItem: ExceptionListItemSchema) => {
      return artifactCardPropsPerItem[artifactItem.id];
    },
    [artifactCardPropsPerItem]
  );
};
