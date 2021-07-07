/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function SyntheticsIntegrationPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  const fixedFooterHeight = 72; // Size of EuiBottomBar more or less

  return {
    /**
     * Navigates to the Synthetics Integration page
     *
     */
    async navigateToPackagePage(packageVersion: string) {
      await pageObjects.common.navigateToUrl(
        'fleet',
        `/integrations/synthetics-${packageVersion}/add-integration`,
        {
          shouldUseHashForSubUrl: true,
          useActualUrl: true,
        }
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    async navigateToPackageEditPage(packageId: string, agentId: string) {
      await pageObjects.common.navigateToUrl(
        'fleet',
        `/policies/${agentId}/edit-integration/${packageId}`,
        {
          shouldUseHashForSubUrl: true,
          useActualUrl: true,
        }
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Finds and returns the Policy Details Page Save button
     */
    async findSaveButton(isEditPage?: boolean) {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find(
        isEditPage ? 'saveIntegration' : 'createPackagePolicySaveButton'
      );
    },

    /**
     * Finds and returns the Policy Details Page Cancel Button
     */
    async findCancelButton() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('policyDetailsCancelButton');
    },

    /**
     * Determines if the policy was created successfully by looking for the creation success toast
     */
    async isPolicyCreatedSuccessfully() {
      await testSubjects.existOrFail('packagePolicyCreateSuccessToast');
    },

    /**
     * Selects the monitor type
     * @params {monitorType} the type of monitor, tcp, http, or icmp
     */
    async selectMonitorType(monitorType: string) {
      await testSubjects.selectValue('syntheticsMonitorTypeField', monitorType);
    },

    /**
     * Fills a text input
     * @params {testSubj} the testSubj of the input to fill
     * @params {value} the value of the input
     */
    async fillTextInputByTestSubj(testSubj: string, value: string) {
      const field = await testSubjects.find(testSubj);
      await field.scrollIntoViewIfNecessary({ bottomOffset: fixedFooterHeight });
      await field.click();
      await field.clearValue();
      await field.type(value);
    },

    /**
     * Fills a text input
     * @params {testSubj} the testSubj of the input to fill
     * @params {value} the value of the input
     */
    async fillTextInput(field: WebElementWrapper, value: string) {
      await field.scrollIntoViewIfNecessary({ bottomOffset: fixedFooterHeight });
      await field.click();
      await field.clearValue();
      await field.type(value);
    },

    /**
     * Fills a text input
     * @params {testSubj} the testSubj of the comboBox
     */
    async setComboBox(testSubj: string, value: string) {
      await comboBox.setCustom(`${testSubj} > comboBoxInput`, value);
    },

    /**
     * Finds and returns the HTTP advanced options accordion trigger
     */
    async findHTTPAdvancedOptionsAccordion() {
      await this.ensureIsOnPackagePage();
      const accordion = await testSubjects.find('syntheticsHTTPAdvancedFieldsAccordion');
      return accordion;
    },

    /**
     * Finds and returns the enable TLS checkbox
     */
    async findEnableTLSCheckbox() {
      await this.ensureIsOnPackagePage();
      const tlsCheckboxContainer = await testSubjects.find('syntheticsIsTLSEnabled');
      return await tlsCheckboxContainer.findByCssSelector('label');
    },

    /**
     * ensures that the package page is the currently display view
     */
    async ensureIsOnPackagePage() {
      await testSubjects.existOrFail('monitorSettingsSection');
    },

    /**
     * Clicks save button and confirms update on the Policy Details page
     */
    async confirmAndSave(isEditPage?: boolean) {
      await this.ensureIsOnPackagePage();
      const saveButton = await this.findSaveButton(isEditPage);
      saveButton.click();
    },

    /**
     * Fills in the username and password field
     * @params username {string} the value of the username
     * @params password {string} the value of the password
     */
    async configureUsernameAndPassword({ username, password }: Record<string, string>) {
      await this.fillTextInputByTestSubj('syntheticsUsername', username);
      await this.fillTextInputByTestSubj('syntheticsPassword', password);
    },

    /**
     *
     * Configures request headers
     * @params headers {string} an object containing desired headers
     *
     */
    async configureRequestHeaders(headers: Record<string, string>) {
      await this.configureHeaders('syntheticsRequestHeaders', headers);
    },

    /**
     *
     * Configures response headers
     * @params headers {string} an object containing desired headers
     *
     */
    async configureResponseHeaders(headers: Record<string, string>) {
      await this.configureHeaders('syntheticsResponseHeaders', headers);
    },

    /**
     *
     * Configures headers
     * @params testSubj {string} test subj
     * @params headers {string} an object containing desired headers
     *
     */
    async configureHeaders(testSubj: string, headers: Record<string, string>) {
      const headersContainer = await testSubjects.find(testSubj);
      const addHeaderButton = await headersContainer.findByCssSelector('button');
      const keys = Object.keys(headers);

      await Promise.all(
        keys.map(async (key, index) => {
          await addHeaderButton.click();
          const keyField = await headersContainer.findByCssSelector(
            `[data-test-subj="keyValuePairsKey${index}"]`
          );
          const valueField = await headersContainer.findByCssSelector(
            `[data-test-subj="keyValuePairsValue${index}"]`
          );
          await this.fillTextInput(keyField, key);
          await this.fillTextInput(valueField, headers[key]);
        })
      );
    },

    /**
     *
     * Configures request body
     * @params contentType {string} contentType of the request body
     * @params value {string} value of the request body
     *
     */
    async configureRequestBody(testSubj: string, value: string) {
      await testSubjects.click(`syntheticsRequestBodyTab__${testSubj}`);
      const codeEditorContainer = await testSubjects.find('codeEditorContainer');
      const textArea = await codeEditorContainer.findByCssSelector('textarea');
      await textArea.clearValue();
      await textArea.type(value);
    },

    /**
     * Creates basic common monitor details
     * @params name {string} the name of the monitor
     * @params url {string} the url of the monitor
     *
     */
    async createBasicMonitorDetails({ name, apmServiceName, tags }: Record<string, string>) {
      await this.fillTextInputByTestSubj('packagePolicyNameInput', name);
      await this.fillTextInputByTestSubj('syntheticsAPMServiceName', apmServiceName);
      await this.setComboBox('syntheticsTags', tags);
    },

    /**
     * Fills in the fields to create a basic HTTP monitor
     * @params name {string} the name of the monitor
     * @params url {string} the url of the monitor
     *
     */
    async createBasicHTTPMonitorDetails({
      name,
      url,
      apmServiceName,
      tags,
    }: Record<string, string>) {
      await this.createBasicMonitorDetails({ name, apmServiceName, tags });
      await this.fillTextInputByTestSubj('syntheticsUrlField', url);
    },

    /**
     * Fills in the fields to create a basic TCP monitor
     * @params name {string} the name of the monitor
     * @params host {string} the host (and port) of the monitor
     *
     */
    async createBasicTCPMonitorDetails({
      name,
      host,
      apmServiceName,
      tags,
    }: Record<string, string>) {
      await this.selectMonitorType('tcp');
      await this.createBasicMonitorDetails({ name, apmServiceName, tags });
      await this.fillTextInputByTestSubj('syntheticsTCPHostField', host);
    },

    /**
     * Creates a basic ICMP monitor
     * @params name {string} the name of the monitor
     * @params host {string} the host of the monitor
     */
    async createBasicICMPMonitorDetails({
      name,
      host,
      apmServiceName,
      tags,
    }: Record<string, string>) {
      await this.selectMonitorType('icmp');
      await this.fillTextInputByTestSubj('packagePolicyNameInput', name);
      await this.createBasicMonitorDetails({ name, apmServiceName, tags });
      await this.fillTextInputByTestSubj('syntheticsICMPHostField', host);
    },

    /**
     * Enables TLS
     */
    async enableTLS() {
      const tlsCheckbox = await this.findEnableTLSCheckbox();
      await tlsCheckbox.click();
    },

    /**
     * Configures TLS settings
     * @params verificationMode {string} the name of the monitor
     */
    async configureTLSOptions({
      verificationMode,
      ca,
      cert,
      certKey,
      certKeyPassphrase,
    }: Record<string, string>) {
      await this.enableTLS();
      await testSubjects.selectValue('syntheticsTLSVerificationMode', verificationMode);
      await this.fillTextInputByTestSubj('syntheticsTLSCA', ca);
      await this.fillTextInputByTestSubj('syntheticsTLSCert', cert);
      await this.fillTextInputByTestSubj('syntheticsTLSCertKey', certKey);
      await this.fillTextInputByTestSubj('syntheticsTLSCertKeyPassphrase', certKeyPassphrase);
    },

    /**
     * Configure http advanced settings
     */
    async configureHTTPAdvancedOptions({
      username,
      password,
      proxyUrl,
      requestMethod,
      requestHeaders,
      responseStatusCheck,
      responseBodyCheckPositive,
      responseBodyCheckNegative,
      requestBody,
      responseHeaders,
      indexResponseBody,
      indexResponseHeaders,
    }: {
      username: string;
      password: string;
      proxyUrl: string;
      requestMethod: string;
      responseStatusCheck: string;
      responseBodyCheckPositive: string;
      responseBodyCheckNegative: string;
      requestBody: { value: string; type: string };
      requestHeaders: Record<string, string>;
      responseHeaders: Record<string, string>;
      indexResponseBody: boolean;
      indexResponseHeaders: boolean;
    }) {
      await testSubjects.click('syntheticsHTTPAdvancedFieldsAccordion');
      await this.configureResponseHeaders(responseHeaders);
      await this.configureRequestHeaders(requestHeaders);
      await this.configureRequestBody(requestBody.type, requestBody.value);
      await this.configureUsernameAndPassword({ username, password });
      await this.setComboBox('syntheticsResponseStatusCheck', responseStatusCheck);
      await this.setComboBox('syntheticsResponseBodyCheckPositive', responseBodyCheckPositive);
      await this.setComboBox('syntheticsResponseBodyCheckNegative', responseBodyCheckNegative);
      await this.fillTextInputByTestSubj('syntheticsProxyUrl', proxyUrl);
      await testSubjects.selectValue('syntheticsRequestMethod', requestMethod);
      if (!indexResponseBody) {
        const field = await testSubjects.find('syntheticsIndexResponseBody');
        const label = await field.findByCssSelector('label');
        await label.click();
      }
      if (!indexResponseHeaders) {
        const field = await testSubjects.find('syntheticsIndexResponseHeaders');
        const label = await field.findByCssSelector('label');
        await label.click();
      }
    },

    /**
     * Configure tcp advanced settings
     */
    async configureTCPAdvancedOptions({
      proxyUrl,
      requestSendCheck,
      responseReceiveCheck,
      proxyUseLocalResolver,
    }: {
      proxyUrl: string;
      requestSendCheck: string;
      responseReceiveCheck: string;
      proxyUseLocalResolver: boolean;
    }) {
      await testSubjects.click('syntheticsTCPAdvancedFieldsAccordion');
      await this.fillTextInputByTestSubj('syntheticsProxyUrl', proxyUrl);
      await this.fillTextInputByTestSubj('syntheticsTCPRequestSendCheck', requestSendCheck);
      await this.fillTextInputByTestSubj('syntheticsTCPResponseReceiveCheck', responseReceiveCheck);
      if (proxyUseLocalResolver) {
        const field = await testSubjects.find('syntheticsUseLocalResolver');
        const label = await field.findByCssSelector('label');
        await label.click();
      }
    },
  };
}
