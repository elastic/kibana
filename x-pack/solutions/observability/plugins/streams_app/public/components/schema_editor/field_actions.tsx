/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { SchemaEditorFlyout } from './flyout';
import { useSchemaEditorContext } from './schema_editor_context';
import { SchemaField } from './types';
import { UnpromoteFieldModal } from './unpromote_field_modal';
import { useKibana } from '../../hooks/use_kibana';

export const FieldActionsCell = ({ field }: { field: SchemaField }) => {
  const context = useKibana();
  const schemaEditorContext = useSchemaEditorContext();

  const { core } = context;

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'fieldsTableContextMenuPopover',
  });

  const [popoverIsOpen, { off: closePopover, toggle }] = useBoolean(false);

  const panels = useMemo(() => {
    const { onFieldUnmap, onFieldUpdate, stream, withFieldSimulation } = schemaEditorContext;

    let actions = [];

    const openFlyout = (props: { isEditingByDefault: boolean } = { isEditingByDefault: false }) => {
      const overlay = core.overlays.openFlyout(
        toMountPoint(
          <StreamsAppContextProvider context={context}>
            <SchemaEditorFlyout
              field={field}
              onClose={() => overlay.close()}
              onSave={onFieldUpdate}
              stream={stream}
              withFieldSimulation={withFieldSimulation}
              {...props}
            />
          </StreamsAppContextProvider>,
          core
        ),
        { maxWidth: 500 }
      );
    };

    const openUnpromoteModal = () => {
      const overlay = core.overlays.openModal(
        toMountPoint(
          <UnpromoteFieldModal
            field={field}
            onClose={() => overlay.close()}
            onFieldUnmap={onFieldUnmap}
          />,
          core
        ),
        { maxWidth: 500 }
      );
    };

    const viewFieldAction = {
      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
        defaultMessage: 'View field',
      }),
      onClick: () => openFlyout(),
    };

    switch (field.status) {
      case 'mapped':
        actions = [
          viewFieldAction,
          {
            name: i18n.translate('xpack.streams.actions.editFieldLabel', {
              defaultMessage: 'Edit field',
            }),
            onClick: () => openFlyout({ isEditingByDefault: true }),
          },
          {
            name: i18n.translate('xpack.streams.actions.unpromoteFieldLabel', {
              defaultMessage: 'Unmap field',
            }),
            onClick: openUnpromoteModal,
          },
        ];
        break;
      case 'unmapped':
        actions = [
          viewFieldAction,
          {
            name: i18n.translate('xpack.streams.actions.mapFieldLabel', {
              defaultMessage: 'Map field',
            }),
            onClick: () => openFlyout({ isEditingByDefault: true }),
          },
        ];
        break;
      case 'inherited':
        actions = [viewFieldAction];
        break;
    }

    return [
      {
        id: 0,
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle', {
          defaultMessage: 'Field actions',
        }),
        items: actions.map((action) => ({
          name: action.name,
          onClick: () => {
            action.onClick();
            closePopover();
          },
        })),
      },
    ];
  }, [closePopover, context, core, field, schemaEditorContext]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTriggerButton',
            { defaultMessage: 'Open actions menu' }
          )}
          data-test-subj="streamsAppActionsButton"
          iconType="boxesVertical"
          onClick={toggle}
        />
      }
      isOpen={popoverIsOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
