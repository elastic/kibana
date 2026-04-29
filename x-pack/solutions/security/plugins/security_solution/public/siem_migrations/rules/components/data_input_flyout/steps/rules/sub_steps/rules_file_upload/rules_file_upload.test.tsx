/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { RulesFileUploadProps } from './rules_file_upload';
import { RulesFileUpload } from './rules_file_upload';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import { TestProviders } from '../../../../../../../../common/mock';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
// eslint-disable-next-line import/no-nodejs-modules
import os from 'os';
import { splunkTestRules } from './splunk_rules.test.data';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationSource } from '../../../../../../../common/types';

const mockCreateMigration: CreateMigration = jest.fn();
const mockOnRulesFileChanged = jest.fn();
const mockApiError = 'Some Mock API Error';
const migrationName = 'test migration name';

const defaultProps: RulesFileUploadProps = {
  createMigration: mockCreateMigration,
  onRulesFileChanged: mockOnRulesFileChanged,
  apiError: undefined,
  isLoading: false,
  isCreated: false,
  migrationName,
};

const renderTestComponent = (props: Partial<RulesFileUploadProps> = {}) => {
  const finalProps = {
    ...defaultProps,
    ...props,
  };
  return render(
    <TestProviders>
      <RulesFileUpload {...finalProps} />
    </TestProviders>
  );
};

const getTestDir = () => os.tmpdir();

const createRulesFileFromRulesData = (
  data: string,
  destinationDirectory: string,
  fileName: string
) => {
  const filePath = path.join(destinationDirectory, fileName);
  const file = new File([data], filePath, {
    type: 'application/x-ndjson',
  });
  return file;
};

describe('RulesFileUpload', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the upload button', () => {
    const { getByTestId } = renderTestComponent();

    expect(getByTestId('rulesFilePicker')).toBeInTheDocument();
    expect(getByTestId('uploadFileButton')).toBeDisabled();
  });

  it('should be able to upload correct file type', async () => {
    const fileName = 'splunk_rules.test.data.json';
    const ndJSONString = splunkTestRules.map((obj) => JSON.stringify(obj)).join('\n');
    const testFile = createRulesFileFromRulesData(ndJSONString, getTestDir(), fileName);

    const { getByTestId } = renderTestComponent();

    const filePicker = getByTestId('rulesFilePicker');

    act(() => {
      fireEvent.change(filePicker, {
        target: {
          files: [testFile],
        },
      });
    });

    expect(mockOnRulesFileChanged).toHaveBeenCalledWith([testFile]);

    await waitFor(() => {
      expect(filePicker).toHaveAttribute('data-loading', 'true');
    });

    await waitFor(() => {
      expect(filePicker).toHaveAttribute('data-loading', 'false');
    });

    await act(async () => {
      fireEvent.click(getByTestId('uploadFileButton'));
    });

    await waitFor(() => {
      expect(mockCreateMigration).toHaveBeenCalled();
    });

    const rulesToExpect: OriginalRule[] = splunkTestRules.map(({ result: rule }) => ({
      id: rule.id,
      vendor: 'splunk',
      title: rule.title,
      query: rule.search,
      query_language: 'spl',
      description: rule.description,
      severity: rule['alert.severity'] as OriginalRule['severity'],
    }));

    expect(mockCreateMigration).toHaveBeenNthCalledWith(1, {
      migrationName,
      rules: rulesToExpect,
      vendor: MigrationSource.SPLUNK,
    });
  });

  describe('Error Handling', () => {
    const scenarios = [
      {
        subject: 'Non Object Entries',
        fileContent: '["asdadsada"]',
        errorMessage: 'The file contains non-object entries',
      },
      {
        subject: 'Non parsable JSON or ND-JSON',
        fileContent: '[{"testArray"}])',
        errorMessage: 'Cannot parse the file as either a JSON file or NDJSON file',
      },
      {
        subject: 'Empty File',
        fileContent: '',
        errorMessage: 'The file is empty',
      },
    ];

    it('should display API Error', async () => {
      const { getByText } = renderTestComponent({
        apiError: mockApiError,
      });

      await waitFor(() => {
        expect(getByText(mockApiError)).toBeVisible();
      });
    });

    scenarios.forEach((scenario, _idx) => {
      it(`should not be able to upload when file has - ${scenario.subject}`, async () => {
        const fileName = 'invalid_rule_file.json';
        const testFile = createRulesFileFromRulesData(scenario.fileContent, getTestDir(), fileName);

        const { getByTestId, getByText } = renderTestComponent({
          apiError: undefined,
        });

        const filePicker = getByTestId('rulesFilePicker');

        act(() => {
          fireEvent.change(filePicker, {
            target: {
              files: [testFile],
            },
          });
        });

        await waitFor(() => {
          expect(filePicker).toHaveAttribute('data-loading', 'true');
        });

        await waitFor(() => {
          expect(filePicker).toHaveAttribute('data-loading', 'false');
        });

        await waitFor(() => {
          expect(getByText(scenario.errorMessage)).toBeVisible();
        });

        await waitFor(() => {
          expect(getByTestId('uploadFileButton')).toBeDisabled();
        });
      });
    });
  });
});
