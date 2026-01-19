/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

import { PLUGIN_ID } from '../../common';
import { SEARCH_PLAYGROUND_CHAT_PATH, SEARCH_PLAYGROUND_SEARCH_PATH } from '../routes';

export type PlaygroundLocatorParams = {
  'default-index': string;
  search?: boolean;
} & SerializableRecord;

export class PlaygroundLocatorDefinition implements LocatorDefinition<PlaygroundLocatorParams> {
  public readonly getLocation = async (params: PlaygroundLocatorParams) => {
    const defaultIndex = params['default-index'];
    const basePath = params.search ? SEARCH_PLAYGROUND_SEARCH_PATH : SEARCH_PLAYGROUND_CHAT_PATH;
    const path = `${basePath}${defaultIndex ? `?default-index=${defaultIndex}` : ''}`;

    return {
      app: PLUGIN_ID,
      path,
      state: {},
    };
  };

  public readonly id = 'PLAYGROUND_LOCATOR_ID';
}
