/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compressToEncodedURIComponent } from 'lz-string';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchProfilerPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const editorTestSubjectSelector = 'searchProfilerEditor';

  return {
    async editorExists() {
      return await testSubjects.exists(editorTestSubjectSelector);
    },
    async setQuery(query: any) {
      await aceEditor.setValue(editorTestSubjectSelector, JSON.stringify(query));
    },
    async getQuery() {
      return JSON.parse(await aceEditor.getValue(editorTestSubjectSelector));
    },
    async setIndexName(indexName: string) {
      await testSubjects.setValue('indexName', indexName);
    },
    async getIndexName() {
      const indexInput = await testSubjects.find('indexName');
      return await indexInput.getAttribute('value');
    },
    async clickProfileButton() {
      await testSubjects.click('profileButton');
    },
    async getProfileContent() {
      const profileTree = await find.byClassName('prfDevTool__main__profiletree');
      return profileTree.getVisibleText();
    },
    getUrlWithIndexAndQuery({ indexName, query }: { indexName: string; query: any }) {
      const searchQueryURI = compressToEncodedURIComponent(JSON.stringify(query, null, 2));
      return `/searchprofiler?index=${indexName}&load_from=${searchQueryURI}`;
    },
    async editorHasParseErrors() {
      return await aceEditor.hasParseErrors(editorTestSubjectSelector);
    },
    async editorHasErrorNotification() {
      const notification = await testSubjects.find('noShardsNotification');
      const text = await notification.getVisibleText();
      return text.includes('Unable to profile');
    },
  };
}
