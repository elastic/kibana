/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiDataGrid,
  EuiDataGridCellProps,
  EuiDataGridColumnSortingConfig,
  EuiDataGridProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPortal,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSearchBar,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { WiredStreamDefinition } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FieldStatusFilterGroup } from './filters/status_filter_group';
import { FieldTypeFilterGroup } from './filters/type_filter_group';
import { TControls, useControls } from './hooks/use_controls';
import { SchemaEditorProps, SchemaField } from './types';
import { FieldParent } from './field_parent';
import { useKibana } from '../../hooks/use_kibana';
import { EMPTY_CONTENT } from './constants';
import { FieldStatusBadge } from './field_status';
import { FieldType } from './field_type';
import { SchemaEditorFlyout } from './flyout';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { SchemaEditorContextProvider, useSchemaEditorContext } from './schema_editor_context';
import { UnpromoteFieldModal } from './unpromote_field_modal';

export function SchemaEditor({
  fields,
  isLoading,
  onFieldUnmap,
  onFieldUpdate,
  stream,
  withControls = false,
  withFieldSimulation = false,
  withTableActions = false,
}: SchemaEditorProps) {
  const [controls, updateControls] = useControls();

  return (
    <SchemaEditorContextProvider
      fields={fields}
      isLoading={isLoading}
      onFieldUnmap={onFieldUnmap}
      onFieldUpdate={onFieldUpdate}
      stream={stream}
      withControls={withControls}
      withFieldSimulation={withFieldSimulation}
      withTableActions={withTableActions}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isLoading ? (
          <EuiPortal>
            <EuiProgress size="xs" color="accent" position="fixed" />
          </EuiPortal>
        ) : null}
        {withControls && <Controls controls={controls} onChange={updateControls} />}
        <FieldsTable
          fields={fields}
          controls={controls}
          stream={stream}
          withTableActions={withTableActions}
        />
      </EuiFlexGroup>
    </SchemaEditorContextProvider>
  );
}

function Controls({
  controls,
  onChange,
}: {
  controls: TControls;
  onChange: (nextControls: Partial<TControls>) => void;
}) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar
            query={controls.query}
            onChange={(nextQuery) => onChange({ query: nextQuery.query ?? undefined })}
            box={{
              incremental: true,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldTypeFilterGroup onChange={onChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldStatusFilterGroup onChange={onChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

const COLUMNS = {
  name: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablenameHeader', {
      defaultMessage: 'Field',
    }),
  },
  type: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTabletypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  format: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableformatHeader', {
      defaultMessage: 'Format',
    }),
  },
  parent: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFieldParentHeader', {
      defaultMessage: 'Field Parent (Stream)',
    }),
  },
  status: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablestatusHeader', {
      defaultMessage: 'Status',
    }),
  },
};

function FieldsTable({
  fields,
  controls,
  stream,
  withTableActions,
}: {
  fields: SchemaField[];
  controls: TControls;
  stream: WiredStreamDefinition;
  withTableActions: boolean;
}) {
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(Object.keys(COLUMNS));
  // Column sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([]);

  const filteredFields = useMemo(() => {
    if (!controls.query && isEmpty(controls.type) && isEmpty(controls.status)) {
      return fields;
    }

    const matchingQueryFields = EuiSearchBar.Query.execute(controls.query, fields, {
      defaultFields: ['name', 'type'],
    });

    const filteredByGroupsFields = matchingQueryFields.filter((field) => {
      return (
        (isEmpty(controls.type) || (field.type && controls.type.includes(field.type))) && // Filter by applied type
        (isEmpty(controls.status) || controls.status.includes(field.status)) // Filter by applied status
      );
    });

    return filteredByGroupsFields;
  }, [fields, controls]);

  const trailingColumns = useMemo<EuiDataGridProps['trailingControlColumns']>(() => {
    if (!withTableActions) return undefined;

    return [
      {
        id: 'field-actions',
        width: 40,
        headerCellRender: () => (
          <EuiScreenReaderOnly>
            <span>{fieldActionsTitle}</span>
          </EuiScreenReaderOnly>
        ),
        rowCellRender: ({ rowIndex }) => {
          const field = fields[rowIndex];

          if (!field) return null;

          return <FieldActionsCell field={field} />;
        },
      },
    ];
  }, [withTableActions, fields]);

  const RenderCellValue = useMemo(
    () => createCellRenderer(filteredFields, stream),
    [filteredFields, stream]
  );

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.streams.streamDetailSchemaEditor.fieldsTable.actionsTitle',
        { defaultMessage: 'Preview' }
      )}
      columns={Object.entries(COLUMNS).map(([columnId, value]) => ({
        id: columnId,
        ...value,
      }))}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
        canDragAndDropColumns: false,
      }}
      sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
      toolbarVisibility={true}
      rowCount={filteredFields.length}
      renderCellValue={RenderCellValue}
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'none',
        rowHover: 'none',
        header: 'underline',
      }}
      inMemory={{ level: 'sorting' }}
    />
  );
}

const fieldActionsTitle = i18n.translate(
  'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle',
  { defaultMessage: 'Field actions' }
);

const createCellRenderer =
  (fields: SchemaField[], stream: WiredStreamDefinition): EuiDataGridCellProps['renderCellValue'] =>
  ({ rowIndex, columnId }) => {
    const field = fields[rowIndex];
    if (!field) return null;
    const { parent, status } = field;

    if (columnId === 'type') {
      if (!field.type) return EMPTY_CONTENT;
      return <FieldType type={field.type} />;
    }

    if (columnId === 'parent') {
      return <FieldParent parent={parent} linkEnabled={field.parent !== stream.name} />;
    }

    if (columnId === 'status') {
      return <FieldStatusBadge status={status} />;
    }

    return field[columnId as keyof SchemaField] || EMPTY_CONTENT;
  };

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
              stream={stream}
              onClose={() => overlay.close()}
              onSave={onFieldUpdate}
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
