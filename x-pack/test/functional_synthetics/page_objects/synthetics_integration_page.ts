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
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'fleet',
        `/integrations/synthetics-${packageVersion}/add-integration`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    async navigateToPackageEditPage(packageId: string, agentId: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'fleet',
        `/policies/${agentId}/edit-integration/${packageId}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Finds and returns the Policy Details Page Save button
     */
    async clickSaveButton(isEditPage?: boolean, onlyIfEnabled: boolean = false) {
      const buttonTestSubject = isEditPage ? 'saveIntegration' : 'createPackagePolicySaveButton';
      await this.ensureIsOnPackagePage();

      if (onlyIfEnabled) {
        await testSubjects.clickWhenNotDisabled(buttonTestSubject);
      } else {
        await testSubjects.click(buttonTestSubject);
      }
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
      await testSubjects.existOrFail('postInstallAddAgentModal');
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
     * Finds and returns the enable throttling checkbox
     */
    async findThrottleSwitch() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('syntheticsBrowserIsThrottlingEnabled');
    },

    /**
     * Finds and returns the enable TLS checkbox
     */
    async findEnableTLSSwitch() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('syntheticsIsTLSEnabled');
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
      await this.clickSaveButton(isEditPage, true);
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
      const addHeaderButton = await testSubjects.find(`${testSubj}__button`);
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
      await this.fillCodeEditor(value);
    },

    /**
     *
     * Fills the monaco code editor
     * @params value {string} value of code input
     *
     */
    async fillCodeEditor(value: string) {
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
     * Creates a basic browser monitor
     * @params name {string} the name of the monitor
     * @params zipUrl {string} the zip url of the synthetics suites
     */
    async createBasicBrowserMonitorDetails(
      {
        name,
        inlineScript,
        zipUrl,
        folder,
        params,
        username,
        password,
        apmServiceName,
        tags,
      }: Record<string, string>,
      isInline: boolean = false
    ) {
      await this.selectMonitorType('browser');
      await this.fillTextInputByTestSubj('packagePolicyNameInput', name);
      await this.createBasicMonitorDetails({ name, apmServiceName, tags });
      if (isInline) {
        await testSubjects.click('syntheticsSourceTab__inline');
        await this.fillCodeEditor(inlineScript);
        return;
      }
      await this.fillTextInputByTestSubj('syntheticsBrowserZipUrl', zipUrl);
      await this.fillTextInputByTestSubj('syntheticsBrowserZipUrlFolder', folder);
      await this.fillTextInputByTestSubj('syntheticsBrowserZipUrlUsername', username);
      await this.fillTextInputByTestSubj('syntheticsBrowserZipUrlPassword', password);
      await this.fillCodeEditor(params);
    },

    /**
     * Enables TLS
     */
    async enableTLS() {
      const tlsSwitch = await this.findEnableTLSSwitch();
      await tlsSwitch.click();
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

    /**
     * Configure browser advanced settings
     * @params name {string} the name of the monitor
     * @params zipUrl {string} the zip url of the synthetics suites
     */
    async configureBrowserAdvancedOptions({
      screenshots,
      syntheticsArgs,
      isThrottlingEnabled,
      downloadSpeed,
      uploadSpeed,
      latency,
    }: {
      screenshots: string;
      syntheticsArgs: string;
      isThrottlingEnabled: boolean;
      downloadSpeed: string;
      uploadSpeed: string;
      latency: string;
    }) {
      await testSubjects.click('syntheticsBrowserAdvancedFieldsAccordion');

      const throttleSwitch = await this.findThrottleSwitch();
      if (!isThrottlingEnabled) {
        await throttleSwitch.click();
      }

      await testSubjects.selectValue('syntheticsBrowserScreenshots', screenshots);
      await this.setComboBox('syntheticsBrowserSyntheticsArgs', syntheticsArgs);

      if (isThrottlingEnabled) {
        await this.fillTextInputByTestSubj('syntheticsBrowserDownloadSpeed', downloadSpeed);
        await this.fillTextInputByTestSubj('syntheticsBrowserUploadSpeed', uploadSpeed);
        await this.fillTextInputByTestSubj('syntheticsBrowserLatency', latency);
      }
    },
  };
}
