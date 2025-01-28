/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../utils/testing/rtl_helpers';
import { SourceField } from './source_field';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const onChange = jest.fn();
const onBlur = jest.fn();

describe('<ScriptRecorderFields />', () => {
  const WrappedComponent = ({
    script = '',
    fileName = '',
    type = 'recorder',
    isEdit = false,
  }: {
    isEditable?: boolean;
    script?: string;
    fileName?: string;
    type?: 'recorder' | 'inline';
    isEdit?: boolean;
  }) => {
    return (
      <SourceField
        value={{
          script,
          fileName,
          type,
        }}
        onChange={onChange}
        onBlur={onBlur}
        isEditFlow={isEdit}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ScriptRecorderFields as the default tab', () => {
    const { getByText } = render(<WrappedComponent />);

    expect(getByText('Select or drag and drop a .js file')).toBeInTheDocument();
  });

  it('changes to code editor when selected', async () => {
    const script = 'test script';
    const { getByTestId } = render(<WrappedComponent type="inline" script={script} />);
    expect(getByTestId('codeEditorContainer')).toBeInTheDocument();
  });

  it('displays code editor by default in edit flow', async () => {
    const fileName = 'fileName';
    const script = 'test script';
    const { getByTestId } = render(
      <WrappedComponent fileName={fileName} type="recorder" script={script} isEdit={true} />
    );
    expect(getByTestId('codeEditorContainer')).toBeInTheDocument();
  });

  it('displays filename of existing script in edit flow', async () => {
    const fileName = 'fileName';
    const script = 'test script';
    const { getByText } = render(
      <WrappedComponent fileName={fileName} type="recorder" script={script} isEdit={true} />
    );
    await userEvent.click(getByText(/Upload new script/));
    expect(getByText(fileName)).toBeInTheDocument();
  });
});
