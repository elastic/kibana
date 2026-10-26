/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Shared `data-ebt-element` for clicks in the feature flags management app. */
export const FEATURE_FLAGS_EBT_ELEMENT = 'featureFlagsManagement';

/**
 * Click actions specific to this app. Names describe the user's intent.
 * Pass them to `getEbtProps({ action, element: FEATURE_FLAGS_EBT_ELEMENT })` on the element
 * itself: the click-tracking lint only recognizes a direct `getEbtProps()` spread.
 */
export const FEATURE_FLAGS_EBT_ACTIONS = {
  viewFlag: 'viewFlag',
  viewFlagHistory: 'viewFlagHistory',
  createFlag: 'createFlag',
  saveFlag: 'saveFlag',
  deleteFlag: 'deleteFlag',
  cancel: 'cancel',
  reload: 'reload',
  back: 'back',
  viewApp: 'viewApp',
  createApp: 'createApp',
  saveApp: 'saveApp',
  deleteApp: 'deleteApp',
  editApp: 'editApp',
  createEnvironment: 'createEnvironment',
  saveEnvironment: 'saveEnvironment',
  deleteEnvironment: 'deleteEnvironment',
  editEnvironment: 'editEnvironment',
  copyClientId: 'copyClientId',
  copySdkKey: 'copySdkKey',
  rotateCredential: 'rotateCredential',
  revokeCredential: 'revokeCredential',
  confirm: 'confirm',
  addRule: 'addRule',
  removeRule: 'removeRule',
  moveRule: 'moveRule',
  applyJsonRules: 'applyJsonRules',
  equalizePercentages: 'equalizePercentages',
  addVariation: 'addVariation',
  removeVariation: 'removeVariation',
  addPrerequisite: 'addPrerequisite',
  removePrerequisite: 'removePrerequisite',
  changeSelection: 'changeSelection',
} as const;
