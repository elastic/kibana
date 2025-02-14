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
import { screen } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
// eslint-disable-next-line import/no-nodejs-modules
import os from 'os';
import { splunkTestRules } from './splunk_rules.test.data';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';

const mockCreateMigration: CreateMigration = jest.fn();
const mockApiError = 'Some Mock API Error';

const defaultProps: RulesFileUploadProps = {
  createMigration: mockCreateMigration,
  apiError: undefined,
  isLoading: false,
  isCreated: false,
};

const renderTestComponent = (props: Partial<RulesFileUploadProps> = {}) => {
  const finalProps = {
    ...defaultProps,
    ...props,
  };
  render(
    <I18nProvider>
      <RulesFileUpload {...finalProps} />
    </I18nProvider>
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
    renderTestComponent();

    expect(screen.getByTestId('rulesFilePicker')).toBeInTheDocument();
    expect(screen.getByTestId('uploadFileButton')).toBeDisabled();
  });

  it('should be able to upload correct file type', async () => {
    const fileName = 'splunk_rules.test.data.json';
    const ndJSONString = splunkTestRules.map((obj) => JSON.stringify(obj)).join('\n');
    const testFile = createRulesFileFromRulesData(ndJSONString, getTestDir(), fileName);

    renderTestComponent();

    const filePicker = screen.getByTestId('rulesFilePicker');

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

    await act(async () => {
      fireEvent.click(screen.getByTestId('uploadFileButton'));
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

    expect(mockCreateMigration).toHaveBeenNthCalledWith(1, rulesToExpect);
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

    it('should not be able to upload on API Error', async () => {
      renderTestComponent({
        apiError: mockApiError,
      });

      const fileName = 'splunk_rules.test.data.json';
      const ndJSONString = splunkTestRules.map((obj) => JSON.stringify(obj)).join('\n');
      const testFile = createRulesFileFromRulesData(ndJSONString, getTestDir(), fileName);

      const filePicker = screen.getByTestId('rulesFilePicker');

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

      await act(async () => {
        fireEvent.click(screen.getByTestId('uploadFileButton'));
      });

      await waitFor(() => {
        expect(screen.getByText(mockApiError)).toBeVisible();
        expect(screen.getByTestId('uploadFileButton')).toBeDisabled();
      });
    });
    scenarios.forEach((scenario, _idx) => {
      it(`should not be able to upload when file has - ${scenario.subject}`, async () => {
        const fileName = 'invalid_rule_file.json';
        const testFile = createRulesFileFromRulesData(scenario.fileContent, getTestDir(), fileName);

        renderTestComponent({
          apiError: undefined,
        });

        const filePicker = screen.getByTestId('rulesFilePicker');

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
          expect(screen.getByText(scenario.errorMessage)).toBeVisible();
        });

        await waitFor(() => {
          expect(screen.getByTestId('uploadFileButton')).toBeDisabled();
        });
      });
    });
  });
});
