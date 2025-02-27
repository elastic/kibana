/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transform } from 'stream';
import { createConcatStream, createSplitStream, createMapStream } from '@kbn/utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../../../../../utils/read_stream/create_stream_from_ndjson';

import type { ImportTimelineResponse } from './types';
import { ImportTimelines } from '../../../../../../common/api/timeline';
import { parseOrThrowErrorFactory } from '../../../../../../common/timelines/zod_errors';

const createPlainError = (message: string) => new Error(message);
const parseOrThrow = parseOrThrowErrorFactory(createPlainError);

const validateTimelines = (): Transform =>
  createMapStream((obj: ImportTimelineResponse) =>
    obj instanceof Error ? new BadRequestError(obj.message) : parseOrThrow(ImportTimelines)(obj)
  );
export const createTimelinesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    validateTimelines(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};
