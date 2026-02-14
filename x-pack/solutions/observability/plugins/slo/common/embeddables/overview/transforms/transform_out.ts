/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Reference } from '@kbn/content-management-utils/src/types';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';

export function transformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(storedState: any, references?: Reference[]) {
    const transformsFlow = flow(
      transformTitlesOut<any>,
      (state: any) => transformDrilldownsOut(state, references)
    );
    console.log(storedState, '!! new storedState in transformOut');
    console.log(transformsFlow(storedState), '!!new transform flow');
    return transformsFlow(storedState);
  }
  return transformOut;
}