/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { RawIndicatorFieldId } from '../../../../../common/threat_intelligence/types/indicator';
import { DESCRIPTION } from './translations';

/**
 * Inline definition for a runtime field "threat.indicator.name" we are adding for indicators grid
 */
const indicatorNameField = {
  aggregatable: true,
  name: RawIndicatorFieldId.Name,
  searchable: true,
  type: 'string',
  category: 'threat',
  description: DESCRIPTION,
  esTypes: ['keyword'],
} as const;

export const useTIDataView = () => {
  const sourcererDataView = useSourcererDataView();

  const browserFields = useMemo(() => {
    const { threat = { fields: {} } } = sourcererDataView.browserFields;

    return {
      ...sourcererDataView.browserFields,
      threat: {
        fields: {
          ...threat.fields,
          [indicatorNameField.name]: indicatorNameField,
        },
      },
    };
  }, [sourcererDataView.browserFields]);

  return useMemo(
    () => ({
      ...sourcererDataView,
      browserFields,
      patternList: sourcererDataView.selectedPatterns,
    }),
    [browserFields, sourcererDataView]
  );
};
