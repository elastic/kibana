/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { CustomYaraSignatureCriteria } from './custom_yara_signature_criteria';

const RULE = `rule Example {\n  condition:\n    true\n}`;

describe('CustomYaraSignatureCriteria', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = () => {
      renderResult = mockedContext.render(
        <CustomYaraSignatureCriteria
          os={['windows', 'linux']}
          entries={[
            {
              field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
              type: 'match',
              operator: 'included',
              value: RULE,
            },
          ]}
          data-test-subj="yaraCriteria"
        />
      );
      return renderResult;
    };
  });

  it('shows the operating systems and the rule source', () => {
    render();

    expect(renderResult.getByTestId('yaraCriteria-os').textContent).toEqual(' OSIS Windows, Linux');
    expect(renderResult.getByTestId('yaraCriteria-rule')).toHaveTextContent('rule Example');
    expect(renderResult.getByTestId('yaraCriteria-rule')).toHaveTextContent('condition:');
    expect(renderResult.queryByText(CUSTOM_YARA_SIGNATURE_FIELD_TYPE)).not.toBeInTheDocument();
  });
});
