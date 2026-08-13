/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyWatchPack } from './types';
import { pack as awsIamPack } from './aws-iam/pack';
import { pack as githubActionsPack } from './github-actions/pack';
import { pack as kubernetesPack } from './kubernetes/pack';
import { pack as oktaPack } from './okta/pack';

export type { Hunt, PackEventSource, TechnologyWatchPack } from './types';

const PACKS: Record<string, TechnologyWatchPack> = {
  [oktaPack.id]: oktaPack,
  [awsIamPack.id]: awsIamPack,
  [kubernetesPack.id]: kubernetesPack,
  [githubActionsPack.id]: githubActionsPack,
};

export const packs = Object.values(PACKS);

export const getPack = (id: string): TechnologyWatchPack | undefined => PACKS[id];

export const listPacks = (): TechnologyWatchPack[] => packs;

export { awsIamPack, githubActionsPack, kubernetesPack, oktaPack };
