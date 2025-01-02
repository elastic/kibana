/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExplorerControllerContext } from '../state_machines/logs_explorer_controller';

export type OnUknownDataViewSelectionHandler = (context: LogsExplorerControllerContext) => void;

export interface LogsExplorerCustomizationEvents {
  onUknownDataViewSelection?: OnUknownDataViewSelectionHandler;
}

export interface LogsExplorerCustomizations {
  events?: LogsExplorerCustomizationEvents;
}
