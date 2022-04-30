/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('lists api security and spaces enabled', function () {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./create_lists'));
    loadTestFile(require.resolve('./create_list_items'));
    loadTestFile(require.resolve('./read_lists'));
    loadTestFile(require.resolve('./read_list_items'));
    loadTestFile(require.resolve('./update_lists'));
    loadTestFile(require.resolve('./update_list_items'));
    loadTestFile(require.resolve('./delete_lists'));
    loadTestFile(require.resolve('./delete_list_items'));
    loadTestFile(require.resolve('./find_lists'));
    loadTestFile(require.resolve('./find_list_items'));
    loadTestFile(require.resolve('./import_exceptions'));
    loadTestFile(require.resolve('./import_list_items'));
    loadTestFile(require.resolve('./export_list_items'));
    loadTestFile(require.resolve('./export_exception_list'));
    loadTestFile(require.resolve('./create_exception_lists'));
    loadTestFile(require.resolve('./create_exception_list_items'));
    loadTestFile(require.resolve('./read_exception_lists'));
    loadTestFile(require.resolve('./read_exception_list_items'));
    loadTestFile(require.resolve('./update_exception_lists'));
    loadTestFile(require.resolve('./update_exception_list_items'));
    loadTestFile(require.resolve('./delete_exception_lists'));
    loadTestFile(require.resolve('./delete_exception_list_items'));
    loadTestFile(require.resolve('./find_exception_lists'));
    loadTestFile(require.resolve('./find_exception_list_items'));
    loadTestFile(require.resolve('./read_list_privileges'));
    loadTestFile(require.resolve('./summary_exception_lists'));
  });
};
