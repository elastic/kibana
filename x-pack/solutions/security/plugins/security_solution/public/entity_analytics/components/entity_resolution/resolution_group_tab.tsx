/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { EntityType } from '@kbn/entity-store/public';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useResolutionGroup, RESOLUTION_GROUP_ROUTE } from './hooks/use_resolution_group';
import type { ResolutionGroup } from './hooks/use_resolution_group';
import { useLinkEntities } from './hooks/use_link_entities';
import { useUnlinkEntities } from './hooks/use_unlink_entities';
import { ResolutionGroupTable } from './resolution_group_table';
import { AddEntitiesSection } from './add_entities_section';
import { ConfirmResolutionModal } from './confirm_resolution_modal';
import { getEntityId } from './helpers';
import {
  RESOLUTION_GROUP_LINK_TITLE,
  RESOLUTION_ERROR_TITLE,
  ENTITY_HAS_ALIASES_ERROR,
} from './translations';
import { RESOLUTION_GROUP_TAB_CONTENT_TEST_ID } from './test_ids';

interface ResolutionGroupTabProps {
  entityId: string;
  entityType: EntityType;
}

export const ResolutionGroupTab: React.FC<ResolutionGroupTabProps> = ({ entityId, entityType }) => {
  const { http } = useKibana().services;
  const { addError } = useAppToasts();
  const { data: group, isLoading, isFetching, isError } = useResolutionGroup(entityId);
  const linkEntities = useLinkEntities();
  const unlinkEntities = useUnlinkEntities();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    newEntity: Record<string, unknown> | null;
  }>({ isOpen: false, newEntity: null });
  const [addingEntityId, setAddingEntityId] = useState<string | undefined>();
  const [removingEntityId, setRemovingEntityId] = useState<string | undefined>();

  const targetEntityId = group?.target ? getEntityId(group.target) : undefined;
  const hasGroup = group && group.group_size > 1;

  const excludeEntityIds = useMemo(() => {
    if (!group) return [entityId];
    const ids = [getEntityId(group.target)];
    for (const alias of group.aliases) {
      ids.push(getEntityId(alias));
    }
    return ids;
  }, [group, entityId]);

  const handleRemoveEntity = useCallback(
    (removeEntityId: string) => {
      setRemovingEntityId(removeEntityId);
      unlinkEntities.mutate(
        { entity_ids: [removeEntityId] },
        { onSettled: () => setRemovingEntityId(undefined) }
      );
    },
    [unlinkEntities]
  );

  const groupQueryReady = !isLoading && !isFetching;

  const handleAddEntity = useCallback(
    async (entity: Record<string, unknown>) => {
      if (!groupQueryReady) return;
      const newEntityId = getEntityId(entity);
      setAddingEntityId(newEntityId);
      try {
        // Pre-flight: check if the entity being added already has its own resolution group
        const newEntityGroup = await http.fetch<ResolutionGroup>(RESOLUTION_GROUP_ROUTE, {
          version: '2',
          method: 'GET',
          query: { entity_id: newEntityId },
        });
        if (newEntityGroup.group_size > 1) {
          addError(new Error(ENTITY_HAS_ALIASES_ERROR), { title: RESOLUTION_ERROR_TITLE });
          setAddingEntityId(undefined);
          return;
        }
      } catch (e) {
        // Pre-flight failed — proceed anyway, the server will validate on link
      }

      if (!hasGroup) {
        // First link — need confirmation modal to choose golden entity
        setAddingEntityId(undefined);
        setModalState({ isOpen: true, newEntity: entity });
      } else {
        // Group already exists — link directly to current target
        linkEntities.mutate(
          { target_id: targetEntityId || entityId, entity_ids: [newEntityId] },
          { onSettled: () => setAddingEntityId(undefined) }
        );
      }
    },
    [groupQueryReady, hasGroup, targetEntityId, entityId, linkEntities, http, addError]
  );

  const handleConfirmResolution = useCallback(
    (targetId: string, aliasId: string) => {
      linkEntities.mutate(
        { target_id: targetId, entity_ids: [aliasId] },
        {
          onSuccess: () => {
            setModalState({ isOpen: false, newEntity: null });
          },
        }
      );
    },
    [linkEntities]
  );

  const handleCancelModal = useCallback(() => {
    setModalState({ isOpen: false, newEntity: null });
  }, []);

  // Build a pseudo-entity for the current entity in the modal
  // when no group exists yet (group_size === 1 means target is the entity itself)
  const currentEntityForModal = group?.target ?? null;

  return (
    <>
      <div data-test-subj={RESOLUTION_GROUP_TAB_CONTENT_TEST_ID}>
        <EuiTitle size="xs">
          <h3>{RESOLUTION_GROUP_LINK_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <ResolutionGroupTable
          group={group ?? null}
          isLoading={isLoading || isFetching}
          isError={isError}
          showActions
          onRemoveEntity={handleRemoveEntity}
          targetEntityId={targetEntityId}
          removingEntityId={removingEntityId}
        />
        <EuiSpacer size="l" />
        <AddEntitiesSection
          entityType={entityType}
          excludeEntityIds={excludeEntityIds}
          onAddEntity={handleAddEntity}
          addingEntityId={addingEntityId}
          disabled={!groupQueryReady}
        />
      </div>
      {modalState.isOpen && modalState.newEntity && currentEntityForModal && (
        <ConfirmResolutionModal
          currentEntity={currentEntityForModal}
          newEntity={modalState.newEntity}
          onConfirm={handleConfirmResolution}
          onCancel={handleCancelModal}
          isLoading={linkEntities.isLoading}
        />
      )}
    </>
  );
};
