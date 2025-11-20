/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandDefinition } from '../../..';
import { getCommandNameFromTextInput } from '../../../service/parsed_command_input';
import type { CommandArgDefinition } from '../../../types';

/**
 * Detects and pre-processes pasted commands that contain argument values
 * for arguments that should be handled by selector components.
 *
 * For example: "runscript --ScriptName=\"test.ps1\"" becomes:
 * - cleanedCommand: "runscript --ScriptName"
 * - extractedArgState: { ScriptName: [{ value: "test.ps1", valueText: "test.ps1" }] }
 */
export const detectAndPreProcessPastedCommand = (
  rawInput: string,
  commandDefinitions: CommandDefinition[] = []
): {
  cleanedCommand: string;
  extractedArgState: Record<string, Array<{ value: string; valueText: string }>>;
  hasSelectorArguments: boolean;
} => {
  const result = {
    cleanedCommand: rawInput,
    extractedArgState: {} as Record<string, Array<{ value: string; valueText: string }>>,
    hasSelectorArguments: false,
  };

  // Early return if no input
  if (!rawInput.trim()) {
    return result;
  }

  const commandName = getCommandNameFromTextInput(rawInput);
  const commandDef = commandDefinitions.find((def) => def.name === commandName);

  // Early return if command not found or has no selector arguments
  if (!commandDef?.args) {
    return result;
  }

  // Find arguments that have SelectorComponents (like ScriptName)
  const selectorArguments = Object.entries(commandDef.args).filter(
    ([_, argDef]: [string, CommandArgDefinition]) => argDef.SelectorComponent
  );

  if (selectorArguments.length === 0) {
    return result;
  }

  let cleanedCommand = rawInput;
  let hasProcessedSelectorArgs = false;

  // Process each selector argument to extract embedded values
  for (const [argName] of selectorArguments) {
    const argPattern = new RegExp(`--${argName}\\s*[=]\\s*(["'][^"]*["']|\\S+)`, 'g');
    let match;

    while ((match = argPattern.exec(rawInput)) !== null) {
      hasProcessedSelectorArgs = true; // Mark that we processed a selector argument

      let value = match[1];

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Store the extracted value in argState format
      if (!result.extractedArgState[argName]) {
        result.extractedArgState[argName] = [];
      }

      result.extractedArgState[argName].push({
        value,
        valueText: value,
      });

      // Replace the full argument with value with just the argument name (for both types)
      cleanedCommand = cleanedCommand.replace(match[0], `--${argName}`);
    }
  }

  result.cleanedCommand = cleanedCommand;
  result.hasSelectorArguments = hasProcessedSelectorArgs;

  return result;
};
