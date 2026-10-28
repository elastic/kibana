/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { LookupsFileUpload } from '.';
import { MigrationSource } from '../../../../types';

const selectFiles = async (filePicker: HTMLElement, files: File[]) => {
  await act(async () => {
    fireEvent.change(filePicker, { target: { files } });
  });
};

describe('LookupsFileUpload', () => {
  const missingLookups = ['threat_intel_ip'];
  const props = {
    createResources: jest.fn(),
    migrationSource: MigrationSource.SPLUNK,
    missingLookups,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the file picker', () => {
    const { getByTestId } = render(<LookupsFileUpload {...props} />);
    expect(getByTestId('lookupsFilePicker')).toBeInTheDocument();
  });

  it('renders the file upload button', () => {
    const { getByTestId } = render(<LookupsFileUpload {...props} />);
    expect(getByTestId('uploadFileButton')).toBeInTheDocument();
  });

  it('does not render skip button when onSkip is not provided', () => {
    const { queryByTestId } = render(<LookupsFileUpload {...props} />);
    expect(queryByTestId('lookupsUploadSkipButton')).not.toBeInTheDocument();
  });

  it('renders skip button when onSkip is provided', () => {
    const { getByTestId } = render(<LookupsFileUpload {...props} onSkip={jest.fn()} />);
    expect(getByTestId('lookupsUploadSkipButton')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadSkipButton')).toHaveTextContent('Skip');
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<LookupsFileUpload {...props} onSkip={onSkip} />);
    fireEvent.click(getByTestId('lookupsUploadSkipButton'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows a name error when the selected file is not in the lookup list and keeps upload disabled', async () => {
    const file = new File(['ip\n1.1.1.1\n'], 'other_lookup.csv', { type: 'text/csv' });
    const { getByTestId, getByText } = render(<LookupsFileUpload {...props} />);

    await selectFiles(getByTestId('lookupsFilePicker'), [file]);

    await waitFor(() => {
      expect(
        getByText('The file name must match one of the lookup names in the list above.')
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).toBeDisabled();
    expect(props.createResources).not.toHaveBeenCalled();
  });

  it('rejects a lookup whose name differs only by case and keeps upload disabled', async () => {
    const file = new File(['ip\n1.1.1.1\n'], 'Threat_Intel_IP.csv', { type: 'text/csv' });
    const { getByTestId, getByText } = render(<LookupsFileUpload {...props} />);

    await selectFiles(getByTestId('lookupsFilePicker'), [file]);

    await waitFor(() => {
      expect(
        getByText('The file name must match one of the lookup names in the list above.')
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).toBeDisabled();
    expect(props.createResources).not.toHaveBeenCalled();
  });

  it('uploads a QRadar reference set whose parsed name is in the list and skips one that is not', async () => {
    const matchingContent = JSON.stringify({
      name: 'threat_intel_ip',
      data: [{ value: '1.1.1.1' }],
    });
    const otherContent = JSON.stringify({
      name: 'other_set',
      data: [{ value: '2.2.2.2' }],
    });
    const matchingFile = new File([matchingContent], 'export.json', { type: 'application/json' });
    const otherFile = new File([otherContent], 'other.json', { type: 'application/json' });
    const { getByTestId, getByText } = render(
      <LookupsFileUpload {...props} migrationSource={MigrationSource.QRADAR} />
    );

    await selectFiles(getByTestId('referenceSetsFilePicker'), [matchingFile, otherFile]);

    await waitFor(() => {
      expect(
        getByText(
          'Reference set "other_set" must match a name in the list above. See `name` field in reference set export.'
        )
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).not.toBeDisabled();

    fireEvent.click(getByTestId('uploadFileButton'));

    expect(props.createResources).toHaveBeenCalledWith([
      { type: 'lookup', name: 'threat_intel_ip', content: 'value\r\n1.1.1.1' },
    ]);
  });

  it('enables upload for a matching file and shows an error for the file that does not match', async () => {
    const matchingContent = 'ip\n1.1.1.1\n';
    const matchingFile = new File([matchingContent], 'threat_intel_ip.csv', { type: 'text/csv' });
    const otherFile = new File(['ip\n2.2.2.2\n'], 'other_lookup.csv', { type: 'text/csv' });
    const { getByTestId, getByText } = render(<LookupsFileUpload {...props} />);

    await selectFiles(getByTestId('lookupsFilePicker'), [matchingFile, otherFile]);

    await waitFor(() => {
      expect(
        getByText(
          'other_lookup: The file name must match one of the lookup names in the list above.'
        )
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).not.toBeDisabled();

    fireEvent.click(getByTestId('uploadFileButton'));

    expect(props.createResources).toHaveBeenCalledWith([
      { type: 'lookup', name: 'threat_intel_ip', content: matchingContent },
    ]);
  });

  it('shows an empty-name error for a dotfile and keeps upload disabled', async () => {
    const file = new File(['ip\n1.1.1.1\n'], '.DS_Store', { type: 'text/plain' });
    const { getByTestId, getByText } = render(<LookupsFileUpload {...props} />);

    await selectFiles(getByTestId('lookupsFilePicker'), [file]);

    await waitFor(() => {
      expect(
        getByText('".DS_Store" cannot be uploaded because its lookup name is empty.')
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).toBeDisabled();
    expect(props.createResources).not.toHaveBeenCalled();
  });

  it('uploads the matching file and skips a file with an empty lookup name', async () => {
    const matchingContent = 'ip\n1.1.1.1\n';
    const matchingFile = new File([matchingContent], 'threat_intel_ip.csv', { type: 'text/csv' });
    const emptyNameFile = new File(['ignored'], '.DS_Store', { type: 'text/plain' });
    const { getByTestId, getByText } = render(<LookupsFileUpload {...props} />);

    await selectFiles(getByTestId('lookupsFilePicker'), [matchingFile, emptyNameFile]);

    await waitFor(() => {
      expect(
        getByText('".DS_Store" cannot be uploaded because its lookup name is empty.')
      ).toBeVisible();
    });
    expect(getByTestId('uploadFileButton')).not.toBeDisabled();

    fireEvent.click(getByTestId('uploadFileButton'));

    expect(props.createResources).toHaveBeenCalledWith([
      { type: 'lookup', name: 'threat_intel_ip', content: matchingContent },
    ]);
  });
});
