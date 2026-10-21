/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@kbn/code-editor-mock/jest_helper';
import { ExceptionsListItemGenerator } from '../../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { CustomYaraSignaturesViewMode } from './custom_yara_signatures_view_mode';

describe('CustomYaraSignaturesViewMode', () => {
  const signature = 'rule test_rule { condition: true }';

  it('renders the signature in a code editor', () => {
    const item = new ExceptionsListItemGenerator('seed').generate({
      entries: [
        {
          field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
          operator: 'included',
          type: 'match',
          value: signature,
        },
      ],
    });
    const { getByTestId } = createAppRootMockRenderer().render(
      <CustomYaraSignaturesViewMode item={item} />
    );

    expect(getByTestId('customYaraSignaturesViewMode')).toHaveValue(signature);
  });

  it('renders an empty code editor when the artifact has no entries', () => {
    const item = new ExceptionsListItemGenerator('seed').generate({ entries: [] });
    const { getByTestId } = createAppRootMockRenderer().render(
      <CustomYaraSignaturesViewMode item={item} />
    );

    expect(getByTestId('customYaraSignaturesViewMode')).toHaveValue('');
  });
});
