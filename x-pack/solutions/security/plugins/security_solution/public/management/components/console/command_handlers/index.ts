/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { BaseCommandHandler } from './base_command_handler';
export type { CommandHandler } from './base_command_handler';
export { CommandRegistry, commandRegistry } from './command_registry';
export { RunscriptCommandHandler } from './runscript_handler';
export { UploadCommandHandler } from './upload_handler';

// Initialize the command registry with all available handlers
import { commandRegistry } from './command_registry';
import { RunscriptCommandHandler } from './runscript_handler';
import { UploadCommandHandler } from './upload_handler';

// Register all command handlers
commandRegistry.register(new RunscriptCommandHandler());
commandRegistry.register(new UploadCommandHandler());
