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
  EuiPopover,
  EuiSearchBar,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiDataGridColumnSortingConfig,
  EuiDataGridProps,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { isRootStreamDefinition, WiredStreamGetResponse } from '@kbn/streams-schema';
import { FieldType } from './field_type';
import { FieldStatusBadge } from './field_status';
import { FieldEntry, SchemaEditorEditingState } from './hooks/use_editing_state';
import { SchemaEditorUnpromotingState } from './hooks/use_unpromoting_state';
import { FieldParent } from './field_parent';
import { SchemaEditorQueryAndFiltersState } from './hooks/use_query_and_filters';

interface FieldsTableContainerProps {
  definition: WiredStreamGetResponse;
  unmappedFieldsResult?: string[];
  isLoadingUnmappedFields: boolean;
  query?: Query;
  editingState: SchemaEditorEditingState;
  unpromotingState: SchemaEditorUnpromotingState;
  queryAndFiltersState: SchemaEditorQueryAndFiltersState;
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

export const EMPTY_CONTENT = '-----';

export const FieldsTableContainer = ({
  definition,
  unmappedFieldsResult,
  query,
  editingState,
  unpromotingState,
  queryAndFiltersState,
}: FieldsTableContainerProps) => {
  const inheritedFields = useMemo(() => {
    return Object.entries(definition.inherited_fields).map(([name, field]) => ({
      name,
      type: field.type,
      format: field.format,
      parent: field.from,
      status: 'inherited' as const,
    }));
  }, [definition]);

  const filteredInheritedFields = useMemo(() => {
    if (!query) return inheritedFields;
    return EuiSearchBar.Query.execute(query, inheritedFields, {
      defaultFields: ['name', 'type'],
    });
  }, [inheritedFields, query]);

  const mappedFields = useMemo(() => {
    return Object.entries(definition.stream.ingest.wired.fields).map(([name, field]) => ({
      name,
      type: field.type,
      format: field.format,
      parent: definition.stream.name,
      status: 'mapped' as const,
    }));
    return [];
  }, [definition]);

  const filteredMappedFields = useMemo(() => {
    if (!query) return mappedFields;
    return EuiSearchBar.Query.execute(query, mappedFields, {
      defaultFields: ['name', 'type'],
    });
  }, [mappedFields, query]);

  const unmappedFields = useMemo(() => {
    return unmappedFieldsResult
      ? unmappedFieldsResult.map((field) => ({
          name: field,
          parent: definition.stream.name,
          status: 'unmapped' as const,
        }))
      : [];
  }, [definition.stream.name, unmappedFieldsResult]);

  const filteredUnmappedFields = useMemo(() => {
    if (!unmappedFieldsResult) return [];
    if (!query) return unmappedFields;
    return EuiSearchBar.Query.execute(query, unmappedFields, {
      defaultFields: ['name'],
    });
  }, [unmappedFieldsResult, query, unmappedFields]);

  const allFilteredFields = useMemo(() => {
    return [...filteredInheritedFields, ...filteredMappedFields, ...filteredUnmappedFields];
  }, [filteredInheritedFields, filteredMappedFields, filteredUnmappedFields]);

  const filteredFieldsWithFilterGroupsApplied = useMemo(() => {
    const filterGroups = queryAndFiltersState.filterGroups;
    let fieldsWithFilterGroupsApplied = allFilteredFields;

    if (filterGroups.type && filterGroups.type.length > 0) {
      fieldsWithFilterGroupsApplied = fieldsWithFilterGroupsApplied.filter(
        (field) => 'type' in field && filterGroups.type.includes(field.type)
      );
    }

    if (filterGroups.status && filterGroups.status.length > 0) {
      fieldsWithFilterGroupsApplied = fieldsWithFilterGroupsApplied.filter(
        (field) => 'status' in field && filterGroups.status.includes(field.status)
      );
    }

    return fieldsWithFilterGroupsApplied;
  }, [allFilteredFields, queryAndFiltersState.filterGroups]);

  return (
    <FieldsTable
      fields={filteredFieldsWithFilterGroupsApplied}
      editingState={editingState}
      unpromotingState={unpromotingState}
      definition={definition}
    />
  );
};

interface FieldsTableProps {
  definition: WiredStreamGetResponse;
  fields: FieldEntry[];
  editingState: SchemaEditorEditingState;
  unpromotingState: SchemaEditorUnpromotingState;
}

const FieldsTable = ({ definition, fields, editingState, unpromotingState }: FieldsTableProps) => {
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(Object.keys(COLUMNS));

  // Column sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([]);

  const trailingColumns = useMemo(() => {
    return !isRootStreamDefinition(definition.stream)
      ? ([
          {
            id: 'actions',
            width: 40,
            headerCellRender: () => null,
            rowCellRender: ({ rowIndex }) => {
              const field = fields[rowIndex];

              if (!field) return null;

              let actions: ActionsCellActionsDescriptor[] = [];

              switch (field.status) {
                case 'mapped':
                  actions = [
                    {
                      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                        defaultMessage: 'View field',
                      }),
                      disabled: editingState.isSaving,
                      onClick: (fieldEntry: FieldEntry) => {
                        editingState.selectField(fieldEntry, false);
                      },
                    },
                    {
                      name: i18n.translate('xpack.streams.actions.editFieldLabel', {
                        defaultMessage: 'Edit field',
                      }),
                      disabled: editingState.isSaving,
                      onClick: (fieldEntry: FieldEntry) => {
                        editingState.selectField(fieldEntry, true);
                      },
                    },
                    {
                      name: i18n.translate('xpack.streams.actions.unpromoteFieldLabel', {
                        defaultMessage: 'Unmap field',
                      }),
                      disabled: unpromotingState.isUnpromotingField,
                      onClick: (fieldEntry: FieldEntry) => {
                        unpromotingState.setSelectedField(fieldEntry.name);
                      },
                    },
                  ];
                  break;
                case 'unmapped':
                  actions = [
                    {
                      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                        defaultMessage: 'View field',
                      }),
                      disabled: editingState.isSaving,
                      onClick: (fieldEntry: FieldEntry) => {
                        editingState.selectField(fieldEntry, false);
                      },
                    },
                    {
                      name: i18n.translate('xpack.streams.actions.mapFieldLabel', {
                        defaultMessage: 'Map field',
                      }),
                      disabled: editingState.isSaving,
                      onClick: (fieldEntry: FieldEntry) => {
                        editingState.selectField(fieldEntry, true);
                      },
                    },
                  ];
                  break;
                case 'inherited':
                  actions = [
                    {
                      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                        defaultMessage: 'View field',
                      }),
                      disabled: editingState.isSaving,
                      onClick: (fieldEntry: FieldEntry) => {
                        editingState.selectField(fieldEntry, false);
                      },
                    },
                  ];
                  break;
              }

              return (
                <ActionsCell
                  panels={[
                    {
                      id: 0,
                      title: i18n.translate(
                        'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle',
                        {
                          defaultMessage: 'Actions',
                        }
                      ),
                      items: actions.map((action) => ({
                        name: action.name,
                        icon: action.icon,
                        onClick: (event) => {
                          action.onClick(field);
                        },
                      })),
                    },
                  ]}
                />
              );
            },
          },
        ] as EuiDataGridProps['trailingControlColumns'])
      : undefined;
  }, [definition, editingState, fields, unpromotingState]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.streams.streamDetailSchemaEditor.fieldsTable.actionsTitle',
        {
          defaultMessage: 'Preview',
        }
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
      rowCount={fields.length}
      renderCellValue={({ rowIndex, columnId }) => {
        const field = fields[rowIndex];
        if (!field) return null;

        if (columnId === 'type') {
          const fieldType = field.type;
          if (!fieldType) return EMPTY_CONTENT;
          return <FieldType type={fieldType} />;
        } else if (columnId === 'parent') {
          return (
            <FieldParent
              parent={field.parent}
              linkEnabled={field.parent !== definition.stream.name}
            />
          );
        } else if (columnId === 'status') {
          return <FieldStatusBadge status={field.status} />;
        } else {
          return field[columnId as keyof FieldEntry] || EMPTY_CONTENT;
        }
      }}
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'none',
        rowHover: 'none',
        header: 'underline',
      }}
      inMemory={{ level: 'sorting' }}
    />
  );
};

export const ActionsCell = ({ panels }: { panels: EuiContextMenuPanelDescriptor[] }) => {
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'fieldsTableContextMenuPopover',
  });

  const [popoverIsOpen, togglePopoverIsOpen] = useToggle(false);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTriggerButton',
            {
              defaultMessage: 'Open actions menu',
            }
          )}
          data-test-subj="streamsAppActionsButton"
          iconType="boxesVertical"
          onClick={() => {
            togglePopoverIsOpen();
          }}
        />
      }
      isOpen={popoverIsOpen}
      closePopover={() => togglePopoverIsOpen(false)}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels.map((panel) => ({
          ...panel,
          items: panel.items?.map((item) => ({
            name: item.name,
            icon: item.icon,
            onClick: (event) => {
              if (item.onClick) {
                item.onClick(event as any);
              }
              togglePopoverIsOpen(false);
            },
          })),
        }))}
      />
    </EuiPopover>
  );
};

export type ActionsCellActionsDescriptor = Omit<EuiContextMenuPanelItemDescriptor, 'onClick'> & {
  onClick: (field: FieldEntry) => void;
};
