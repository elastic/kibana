/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError } from '@kbn/core/public';
import type { CommandArgumentValueSelectorProps } from '../../console/types';

/**
 * Base state interface for all argument selectors
 */
export interface BaseSelectorState {
  isPopoverOpen: boolean;
  selectedOption?: unknown;
}

/**
 * Configuration object for BaseArgumentSelector
 */
export interface BaseSelectorConfig {
  initialLabel: string;
  tooltipText: string;
  minWidth: number;
  rowHeight: number;
  selectableId: string;
}

/**
 * Generic hook params type
 */
export type HookParams = unknown;

/**
 * Generic data hook return type
 */
export interface DataHookReturn<TData> {
  data: TData[] | TData;
  isLoading: boolean;
  error: IHttpFetchError<unknown> | null;
}

/**
 * Props for BaseArgumentSelector component
 */
export interface BaseArgumentSelectorProps<
  TData,
  TOption,
  TState extends BaseSelectorState = BaseSelectorState
> extends CommandArgumentValueSelectorProps<string, TState> {
  useDataHook: (params: HookParams) => DataHookReturn<TData>;
  hookParams?: HookParams;
  transformToOptions: (data: TData[], selectedValue?: string) => EuiSelectableOption<TOption>[];
  config: BaseSelectorConfig;
  useErrorToast: (
    error: IHttpFetchError<unknown> | null,
    notifications: NotificationsStart
  ) => void;
  testIdPrefix?: string;
  onSelectionChange?: (option: EuiSelectableOption<TOption> | undefined, state: TState) => void;
}
