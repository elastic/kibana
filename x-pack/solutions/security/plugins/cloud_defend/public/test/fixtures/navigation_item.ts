/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import type { CloudDefendPageNavigationItem } from '../../common/navigation/types';

type CreateNavigationItemFixtureInput = {
  chance?: Chance.Chance;
} & Partial<CloudDefendPageNavigationItem>;
export const createPageNavigationItemFixture = ({
  chance = new Chance(),
  name = chance.word(),
  path = `/${chance.word()}`,
  disabled = undefined,
  id = 'cloud_defend-policies',
}: CreateNavigationItemFixtureInput = {}): CloudDefendPageNavigationItem => ({
  name,
  path,
  disabled,
  id,
});
