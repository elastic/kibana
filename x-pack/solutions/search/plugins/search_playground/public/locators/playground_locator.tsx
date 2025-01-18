/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

import { PLUGIN_ID } from '../../common';

export type PlaygroundLocatorParams = { 'default-index': string } & SerializableRecord;

const PLAYGROUND_URL = '/chat';

export class PlaygroundLocatorDefinition implements LocatorDefinition<PlaygroundLocatorParams> {
  public readonly getLocation = async (params: PlaygroundLocatorParams) => {
    const defaultIndex = params['default-index'];
    const path = `${PLAYGROUND_URL}${defaultIndex ? `?default-index=${defaultIndex}` : ''}`;

    return {
      app: PLUGIN_ID,
      path,
      state: {},
    };
  };

  public readonly id = 'PLAYGROUND_LOCATOR_ID';
}
