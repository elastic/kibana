/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const makeAction = (actionsName: string, icon: string = 'icon', order?: number) => ({
  id: actionsName,
  type: actionsName,
  order,
  getIconType: () => icon,
  getDisplayName: () => actionsName,
  getDisplayNameTooltip: () => actionsName,
  isCompatible: () => Promise.resolve(true),
  execute: () => {
    alert(actionsName);
    return Promise.resolve();
  },
});
