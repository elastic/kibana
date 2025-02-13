/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import type { ExperimentalFeatures } from '../../../../common';
import type { AssetCriticalityUpsert } from '../../../../common/entity_analytics/asset_criticality/types';
import {
  parseAssetCriticalityCsvRow,
  isErrorResult,
} from '../../../../common/entity_analytics/asset_criticality';

class TransformCSVToUpsertRecords extends Transform {
  experimentalFeatures: ExperimentalFeatures;
  constructor(experimentalFeatures: ExperimentalFeatures) {
    super({
      objectMode: true,
    });

    this.experimentalFeatures = experimentalFeatures;
  }

  public _transform(
    chunk: string[],
    encoding: string,
    callback: (error: Error | null, data?: AssetCriticalityUpsert | Error) => void
  ) {
    try {
      const parseResult = parseAssetCriticalityCsvRow(chunk, this.experimentalFeatures);
      if (isErrorResult(parseResult)) {
        return callback(null, new Error(parseResult.error));
      } else {
        callback(null, parseResult.record);
      }
    } catch (err) {
      // we want to handle errors gracefully and continue processing the rest of the file
      callback(null, err);
    }
  }
}

export const transformCSVToUpsertRecords = (experimentalFeatures: ExperimentalFeatures) =>
  new TransformCSVToUpsertRecords(experimentalFeatures);
