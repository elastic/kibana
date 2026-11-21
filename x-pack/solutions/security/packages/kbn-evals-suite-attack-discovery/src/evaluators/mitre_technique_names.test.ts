/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isKnownTechniqueName } from './mitre_technique_names';

describe('isKnownTechniqueName', () => {
  // MITRE names T1562.008 "Disable or Modify Cloud Logs", under "Impair Defenses".
  it.each([
    ['T1562.008', 'Impair Defenses', 'Disable or Modify Cloud Logs'],
    ['T1562.008', 'impair defenses', 'disable or modify cloud logs'],
    ['T1562.008', 'impair defenses', 'disable cloud logs'],
    ['T1562.008', 'impair defenses', 'modify cloud logs'],
    ['T1562.008', 'impair defenses', 'disable cloud logs or modify cloud logs'],
    ['T1562.008', 'Impair Defenses', 'Disable Cloud Logs or Modify Cloud Logs'],
    ['T1562', 'impair defenses', 'disable cloud logs'],
    ['T1562', 'impair defenses', 'disable cloud logs or modify cloud logs'],
    ['T1078', 'valid accounts', 'cloud accounts'],
  ])('reads %s "%s: %s" as a technique name', (id, name, subName) => {
    expect(isKnownTechniqueName(id, name, subName)).toBe(true);
  });

  it.each([
    // Words of the sub-technique's name, but not a phrase MITRE or a reader would call it.
    ['T1562.008', 'impair defenses', 'disable logs'],
    ['T1562.008', 'impair defenses', 'modify logs'],
    ['T1562.008', 'impair defenses', 'logs cloud'],
    // The expanded alternative is exact: no reorder, no half-expanded branch, no foreign branch.
    ['T1562.008', 'impair defenses', 'modify cloud logs or disable cloud logs'],
    ['T1562.008', 'impair defenses', 'disable cloud logs or modify logs'],
    ['T1562.008', 'impair defenses', 'disable logs or modify cloud logs'],
    ['T1562.008', 'impair defenses', 'disable cloud logs or revoke the key'],
    ['T1562.008', 'impair defenses', 'disable cloud logs or'],
    [
      'T1562.008',
      'impair defenses',
      'disable cloud logs or modify cloud logs or modify cloud logs',
    ],
    ['T1078', 'valid accounts', 'cloud accounts or revoke the key'],
    // Advice that merely follows a name.
    ['T1078', 'valid accounts', 'revoke the key'],
    ['T1562.008', 'impair defenses', 'revoke the key'],
    // The name is not one MITRE gives that id.
    ['T1562.008', 'cloud accounts', 'disable cloud logs'],
    ['T1562.008', 'impair defenses', ''],
    ['T9999', 'impair defenses', 'disable cloud logs'],
  ])('does not read %s "%s: %s" as a technique name', (id, name, subName) => {
    expect(isKnownTechniqueName(id, name, subName)).toBe(false);
  });
});
