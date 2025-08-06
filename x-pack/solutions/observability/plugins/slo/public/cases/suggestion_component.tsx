/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';
import React from 'react';
import type { SLOSuggestion } from '../../common/cases/suggestions';

export const SLOSuggestionChildren: React.FC<SuggestionChildrenProps<SLOSuggestion>> = (
  props: SuggestionChildrenProps<SLOSuggestion>
) => {
  const { suggestion } = props;
  return (
    <div>
      {suggestion.data.map((slo) => (
        <div key={slo.payload.id}>
          <h2>{slo.payload.name}</h2>
        </div>
      ))}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default SLOSuggestionChildren;
