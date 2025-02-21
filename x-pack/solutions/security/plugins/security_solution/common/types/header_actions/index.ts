/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import type { IFieldSubType } from '@kbn/es-query';
import type { FieldBrowserOptions } from '@kbn/response-ops-alerts-fields-browser';
import type { ComponentType, JSXElementConstructor } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { OnRowSelected, SetEventsDeleted, SetEventsLoading } from '..';
import type { BrowserFields, TimelineNonEcsData } from '../../search_strategy';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  | 'actions'
  | 'defaultSortDirection'
  | 'display'
  | 'displayAsText'
  | 'id'
  | 'initialWidth'
  | 'isSortable'
  | 'schema'
  | 'isExpandable'
  | 'isResizable'
> & {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  esTypes?: string[];
  example?: string | number | null;
  format?: SerializedFieldFormat;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};
export interface HeaderActionProps {
  width: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: ({ isSelected }: { isSelected: boolean }) => void;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  showFullScreenToggle?: boolean;
  sort: SortColumnTable[];
  tabType: string;
  timelineId: string;
}

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;

type GenericActionRowCellRenderProps = Pick<
  EuiDataGridCellValueElementProps,
  'rowIndex' | 'columnId'
> &
  Partial<EuiDataGridCellValueElementProps>;

export type RowCellRender =
  | JSXElementConstructor<GenericActionRowCellRenderProps>
  | ((props: GenericActionRowCellRenderProps) => JSX.Element)
  | JSXElementConstructor<ActionProps>
  | ((props: ActionProps) => JSX.Element);

export interface ActionProps {
  action?: RowCellRender;
  ariaRowindex: number;
  checked: boolean;
  columnId: string;
  columnValues: string;
  data: TimelineNonEcsData[];
  disableExpandAction?: boolean;
  disabled?: boolean;
  ecsData: Ecs;
  eventId: string;
  eventIdToNoteIds?: Readonly<Record<string, string[]>>;
  index: number;
  isEventPinned?: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  refetch?: () => void;
  rowIndex: number;
  setEventsDeleted: SetEventsDeleted;
  setEventsLoading: SetEventsLoading;
  showCheckboxes: boolean;
  /**
   * This prop is used to determine if the notes button should be displayed
   * as the part of Row Actions
   * */
  showNotes?: boolean;
  tabType?: string;
  timelineId: string;
  toggleShowNotes?: () => void;
  width?: number;
  disablePinAction?: boolean;
  disableTimelineAction?: boolean;
}

interface AdditionalControlColumnProps {
  ariaRowindex: number;
  actionsColumnWidth: number;
  columnValues: string;
  checked: boolean;
  onRowSelected: OnRowSelected;
  eventId: string;
  columnId: string;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  showCheckboxes: boolean;
  // Override these type definitions to support either a generic custom component or the one used in security_solution today.
  headerCellRender: HeaderCellRender;
  rowCellRender: RowCellRender;
}

export type ControlColumnProps = Omit<
  EuiDataGridControlColumn,
  keyof AdditionalControlColumnProps
> &
  Partial<AdditionalControlColumnProps>;
