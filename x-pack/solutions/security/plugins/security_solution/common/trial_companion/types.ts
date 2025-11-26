/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Milestone {
  M1 = 1,
  M2 = 2,
  M3 = 3,
  M4 = 4,
  M5 = 5,
  M6 = 6,
  M7 = 7,
}

export interface NBAAction {
  app: string;
  text: string;
}

export interface NBA {
  message: string;
  title: string;
  apps: NBAAction[] | undefined; // TODO: for two apps - how-to pass text to the buttons?
}
