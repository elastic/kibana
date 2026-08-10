/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';

export type SecurityActionMenuActionId = string;

export interface SecurityActionMenuPlacement<TActionId extends string = string> {
  before?: TActionId;
  after?: TActionId;
}

export interface SecurityActionMenuContribution<TActionId extends string = string> {
  id: TActionId;
  items: EuiContextMenuPanelItemDescriptor[];
  panels?: EuiContextMenuPanelDescriptor[];
  placement?: SecurityActionMenuPlacement<string>;
}

export interface SecurityActionMenuGroup<
  TActionId extends string = string,
  TGroupId extends string = string
> {
  id: TGroupId;
  actionIds: readonly TActionId[];
}

export interface SecurityActionMenuPreset<
  TActionId extends string = string,
  TGroupId extends string = string
> {
  groups: readonly SecurityActionMenuGroup<TActionId, TGroupId>[];
}
