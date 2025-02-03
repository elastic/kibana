/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
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
import { FieldEntry } from './hooks/use_editing_state';
import { useKibana } from '../../hooks/use_kibana';
import { EMPTY_CONTENT } from './constants';
import { FieldStatusBadge } from './field_status';
import { FieldType } from './field_type';

const SchemaEditorContext = React.createContext<SchemaEditorProps | undefined>(undefined);

export function SchemaEditor({
  fields,
  isLoading,
  stream,
  withControls = false,
  withTableActions = false,
}: SchemaEditorProps) {
  const [controls, updateControls] = useControls();

  return (
    <SchemaEditorContext.Provider value={{ fields }}>
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
    </SchemaEditorContext.Provider>
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
          <FieldTypeFilterGroup onChangeFilterGroup={onChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldStatusFilterGroup onChangeFilterGroup={onChange} />
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
    const { query, type, status } = controls;
    if (!query && isEmpty(type) && isEmpty(status)) return fields;

    const matchingQueryFields = EuiSearchBar.Query.execute(query, fields, {
      defaultFields: ['name', 'type'],
    });

    const filteredByGroupsFields = matchingQueryFields.filter((field) => {
      return (
        (isEmpty(type) || type.includes(field.type)) && // Filter by applyed type
        (isEmpty(status) || status.includes(field.status)) // Filter by applyed status
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
    const { type, parent, status } = field;

    if (columnId === 'type') {
      if (!type) return EMPTY_CONTENT;
      return <FieldType type={type} />;
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
  const { core } = useKibana();
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'fieldsTableContextMenuPopover',
  });

  const [popoverIsOpen, { off: closePopover, toggle }] = useBoolean(false);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    let actions: ActionsCellActionsDescriptor[] = [];

    const viewFieldAction: ActionsCellActionsDescriptor = {
      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
        defaultMessage: 'View field',
      }),
      // disabled: editingState.isSaving,
      onClick: (fieldEntry: FieldEntry) => {
        // editingState.selectField(fieldEntry, false);
      },
    };

    switch (field.status) {
      case 'mapped':
        actions = [
          viewFieldAction,
          {
            name: i18n.translate('xpack.streams.actions.editFieldLabel', {
              defaultMessage: 'Edit field',
            }),
            // disabled: editingState.isSaving,
            // onClick: (fieldEntry: FieldEntry) => {
            //   editingState.selectField(fieldEntry, true);
            // },
          },
          {
            name: i18n.translate('xpack.streams.actions.unpromoteFieldLabel', {
              defaultMessage: 'Unmap field',
            }),
            // disabled: unpromotingState.isUnpromotingField,
            // onClick: (fieldEntry: FieldEntry) => {
            //   unpromotingState.setSelectedField(fieldEntry.name);
            // },
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
            onClick: (fieldEntry: FieldEntry) => {
              core.overlays.openFlyout(toMountPoint(<h1>{fieldEntry.name}</h1>, core), {
                maxWidth: 500,
                onClose: (flyout) => flyout.close(),
              });
            },
            // disabled: editingState.isSaving,
            // onClick: (fieldEntry: FieldEntry) => {
            //   editingState.selectField(fieldEntry, true);
            // },
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
          icon: action.icon,
          onClick: () => {
            action.onClick(field);
            closePopover();
          },
        })),
      },
    ];
  }, [closePopover, core, field]);

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

export type ActionsCellActionsDescriptor = Omit<EuiContextMenuPanelItemDescriptor, 'onClick'> & {
  onClick: (field: FieldEntry) => void;
};
