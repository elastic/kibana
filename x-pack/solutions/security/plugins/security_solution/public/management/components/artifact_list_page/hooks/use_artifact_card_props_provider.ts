/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useCallback, useMemo } from 'react';
import type { AnyArtifact, ArtifactEntryCardProps } from '../../artifact_entry_card';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useArtifactAssignedPolicies } from './use_artifact_assigned_policies';

const EMPTY_EXCEPTION_LIST_ITEMS: ExceptionListItemSchema[] = [];

type CardActionType = 'edit' | 'delete';

export interface UseArtifactCardPropsProviderProps {
  items: ExceptionListItemSchema[];
  onAction: (action: { type: CardActionType; item: ExceptionListItemSchema }) => void;
  cardActionEditLabel: string;
  cardActionDeleteLabel: string;
  dataTestSubj?: string;
  allowCardEditAction?: boolean;
  allowCardDeleteAction?: boolean;
  disabled?: boolean;
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
  disabled = false,
}: UseArtifactCardPropsProviderProps): ArtifactCardPropsProvider => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const itemsToUse = disabled ? EMPTY_EXCEPTION_LIST_ITEMS : items;
  const { policies } = useArtifactAssignedPolicies(itemsToUse);

  const artifactCardPropsPerItem = useMemo(() => {
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    // with common component's props
    for (const artifactItem of itemsToUse as ExceptionListItemSchema[]) {
      const cardActions: ArtifactEntryCardProps['actions'] = [];

      if (allowCardEditAction) {
        cardActions.push({
          icon: 'controls',
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
    itemsToUse,
    allowCardEditAction,
    allowCardDeleteAction,
    policies,
    dataTestSubj,
    getTestId,
    cardActionEditLabel,
    onAction,
    cardActionDeleteLabel,
  ]);

  return useCallback(
    (artifactItem: ExceptionListItemSchema) => {
      return artifactCardPropsPerItem[artifactItem.id];
    },
    [artifactCardPropsPerItem]
  );
};
