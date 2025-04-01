/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import {
  CONFIDENCE,
  FEED,
  FIRST_SEEN,
  INDICATORS,
  LAST_SEEN,
  TIMESTAMP,
  TLP_MARKETING,
  TYPE,
} from './translations';

interface IndicatorFieldLabelProps {
  field: string;
}

/**
 * Renders field label using i18n, or the field key if the translation is not available
 */
export const IndicatorFieldLabel: VFC<IndicatorFieldLabelProps> = ({ field }) => (
  <>{translateFieldLabel(field)}</>
);

/** This translates the field name using kbn-i18n */
export const translateFieldLabel = (field: string) => {
  // This switch is necessary as i18n id cannot be dynamic, see:
  // https://github.com/elastic/kibana/blob/main/src/dev/i18n_tools/README.md
  switch (field) {
    case RawIndicatorFieldId.TimeStamp: {
      return TIMESTAMP;
    }
    case RawIndicatorFieldId.Name: {
      return INDICATORS;
    }
    case RawIndicatorFieldId.Type: {
      return TYPE;
    }
    case RawIndicatorFieldId.Feed: {
      return FEED;
    }
    case RawIndicatorFieldId.FirstSeen: {
      return FIRST_SEEN;
    }
    case RawIndicatorFieldId.LastSeen: {
      return LAST_SEEN;
    }
    case RawIndicatorFieldId.Confidence: {
      return CONFIDENCE;
    }
    case RawIndicatorFieldId.MarkingTLP: {
      return TLP_MARKETING;
    }
    default:
      return field;
  }
};
