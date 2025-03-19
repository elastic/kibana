/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

export const TimestampFromString = new rt.Type<number, string>(
  'TimestampFromString',
  (input): input is number => typeof input === 'number',
  (input, context) =>
    pipe(
      rt.string.validate(input, context),
      chain((stringInput) => {
        const momentValue = moment(stringInput);
        return momentValue.isValid()
          ? rt.success(momentValue.valueOf())
          : rt.failure(stringInput, context);
      })
    ),
  (output) => new Date(output).toISOString()
);

export const SourceConfigurationSavedObjectFieldColumnRT = rt.type({
  fieldColumn: rt.type({
    id: rt.string,
    field: rt.string,
  }),
});

export const SourceConfigurationSavedObjectMessageColumnRT = rt.type({
  messageColumn: rt.type({
    id: rt.string,
  }),
});

export const SourceConfigurationSavedObjectTimestampColumnRT = rt.type({
  timestampColumn: rt.type({
    id: rt.string,
  }),
});

export const SourceConfigurationSavedObjectColumnRT = rt.union([
  SourceConfigurationSavedObjectTimestampColumnRT,
  SourceConfigurationSavedObjectMessageColumnRT,
  SourceConfigurationSavedObjectFieldColumnRT,
]);

export const logIndexPatternSavedObjectReferenceRT = rt.type({
  type: rt.literal('index_pattern'),
  indexPatternId: rt.string,
});

export const logIndexNameSavedObjectReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});

export const kibanaAdvancedSettingSavedObjectReferenceRT = rt.type({
  type: rt.literal('kibana_advanced_setting'),
});

export const logIndexSavedObjectReferenceRT = rt.union([
  logIndexPatternSavedObjectReferenceRT,
  logIndexNameSavedObjectReferenceRT,
  kibanaAdvancedSettingSavedObjectReferenceRT,
]);

export const SourceConfigurationSavedObjectAttributesRT = rt.type({
  name: rt.string,
  description: rt.string,
  metricAlias: rt.string,
  logIndices: logIndexSavedObjectReferenceRT,
  inventoryDefaultView: rt.string,
  metricsExplorerDefaultView: rt.string,
  logColumns: rt.array(SourceConfigurationSavedObjectColumnRT),
  anomalyThreshold: rt.number,
});

export const SavedSourceConfigurationSavedObjectRT = rt.partial(
  SourceConfigurationSavedObjectAttributesRT.props
);

export const SourceConfigurationSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: SavedSourceConfigurationSavedObjectRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: TimestampFromString,
  }),
]);
