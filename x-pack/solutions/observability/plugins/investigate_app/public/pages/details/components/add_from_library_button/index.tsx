/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlayRef } from '@kbn/core/public';
import { v4 } from 'uuid';
import { openAddFromLibraryFlyout } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import React, { useMemo, useRef } from 'react';
import { Item } from '@kbn/investigation-shared';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import { EuiButtonEmpty } from '@elastic/eui';
import { EMBEDDABLE_ITEM_TYPE } from '../../../../items/embeddable_item/register_embeddable_item';
import { useKibana } from '../../../../hooks/use_kibana';
interface AddFromLibraryButtonProps {
  onItemAdd: (item: Item) => Promise<void>;
}

type InvestigationContainer = CanAddNewPanel & {
  addNewEmbeddable: (
    type: string,
    explicitInput: { savedObjectId: string },
    attributes: FinderAttributes
  ) => Promise<{ id: string }>;
};

export function AddFromLibraryButton({ onItemAdd }: AddFromLibraryButtonProps) {
  const {
    dependencies: {
      start: { contentManagement },
    },
  } = useKibana();

  const panelRef = useRef<OverlayRef>();

  const container = useMemo<
    InvestigationContainer & {
      addNewEmbeddable: (
        type: string,
        explicitInput: { savedObjectId: string },
        attributes: FinderAttributes
      ) => Promise<{ id: string }>;
    }
  >(() => {
    function addEmbeddable({
      type,
      title,
      attributes,
      savedObjectId,
    }: {
      type: string;
      title: string;
      attributes: Record<string, any>;
      savedObjectId: string;
    }) {
      const embeddableItem = {
        title,
        type: EMBEDDABLE_ITEM_TYPE,
        params: {
          savedObjectId,
          config: {},
          type,
        },
      };
      onItemAdd(embeddableItem).then(() => {
        if (panelRef.current) {
          panelRef.current.close();
        }
      });
    }
    return {
      addNewPanel: async (panel, displaySuccessMessage) => {
        const state = panel.initialState! as {
          savedObjectId: string;
        };
        const savedObject = (await contentManagement.client.get({
          contentTypeId: panel.panelType,
          id: state.savedObjectId,
        })) as { item: { attributes: { title: string } } };
        addEmbeddable({
          type: panel.panelType,
          savedObjectId: state.savedObjectId,
          attributes: {},
          title: savedObject.item.attributes.title,
        });

        return undefined as any;
      },
      addNewEmbeddable: async (type, explicitInput, attributes) => {
        addEmbeddable({
          type,
          title: attributes.title ?? '',
          savedObjectId: explicitInput.savedObjectId,
          attributes,
        });
        return { id: v4() };
      },
    };
  }, [contentManagement.client, onItemAdd]);

  return (
    <EuiButtonEmpty
      data-test-subj="investigateAppAddFromLibraryButtonImportFromLibraryButton"
      iconType="importAction"
      onClick={() => {
        panelRef.current = openAddFromLibraryFlyout({
          container,
        });

        panelRef.current.onClose.then(() => {
          panelRef.current = undefined;
        });
      }}
    >
      {i18n.translate('xpack.investigateApp.addFromLibraryButtonLabel', {
        defaultMessage: 'Import from library',
      })}
    </EuiButtonEmpty>
  );
}
