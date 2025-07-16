/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import {
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { RETRIEVE_DOCUMENTATION_NAME } from '../../../../server/functions/documentation';
import { chatClient, kibanaClient, logger } from '../../services';

const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
const ELASTIC_DOCS_UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';

const inferenceId = defaultInferenceEndpoints.ELSER;
describe('Retrieve documentation function', () => {
  before(async () => {
    let statusResponse = await kibanaClient.callKibana<InstallationStatusResponse>('get', {
      pathname: ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH,
      query: {
        inferenceId,
      },
    });

    if (statusResponse.data.overall === 'installed') {
      logger.success('Elastic documentation is already installed');
    } else {
      logger.info('Installing Elastic documentation');
      const installResponse = await kibanaClient.callKibana<PerformInstallResponse>(
        'post',
        {
          pathname: ELASTIC_DOCS_INSTALL_ALL_API_PATH,
        },
        {
          inferenceId,
        }
      );

      if (!installResponse.data.installed) {
        logger.error('Could not install Elastic documentation');
        throw new Error('Documentation did not install successfully before running tests.');
      }

      statusResponse = await kibanaClient.callKibana<InstallationStatusResponse>('get', {
        pathname: ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH,
        query: {
          inferenceId,
        },
      });

      if (statusResponse.data.overall !== 'installed') {
        throw new Error('Documentation is not fully installed, cannot proceed with tests.');
      } else {
        logger.success('Installed Elastic documentation');
      }
    }
  });

  it('retrieves Elasticsearch documentation', async () => {
    const prompt = 'How can I configure HTTPS in Elasticsearch?';
    const conversation = await chatClient.complete({ messages: prompt });

    const result = await chatClient.evaluate(conversation, [
      `Uses the ${RETRIEVE_DOCUMENTATION_NAME} function before answering the question about the Elastic stack`,
      'The assistant provides guidance on configuring HTTPS for Elasticsearch based on the retrieved documentation',
      'Does not hallucinate steps without first calling the retrieve_elastic_doc function',
      'Mentions Elasticsearch and HTTPS configuration steps consistent with the documentation',
    ]);

    expect(result.passed).to.be(true);
  });

  it('retrieves Kibana documentation', async () => {
    const prompt = 'What is Kibana Lens and how do I create a bar chart visualization with it?';
    const conversation = await chatClient.complete({ messages: prompt });

    const result = await chatClient.evaluate(conversation, [
      `Uses the ${RETRIEVE_DOCUMENTATION_NAME} function before answering the question about Kibana`,
      'Accurately explains what Kibana Lens is and provides doc-based steps for creating a bar chart visualization',
      `Does not invent unsupported instructions, answers should reference what's found in the Kibana docs`,
    ]);
    expect(result.passed).to.be(true);
  });

  it('retrieves Observability documentation', async () => {
    const prompt =
      'How can I set up APM instrumentation for my Node.js service in Elastic Observability?';
    const conversation = await chatClient.complete({ messages: prompt });

    const result = await chatClient.evaluate(conversation, [
      `Uses the ${RETRIEVE_DOCUMENTATION_NAME} function before answering the question about Observability`,
      'Provides instructions based on the Observability docs for setting up APM instrumentation in a Node.js service',
      'Mentions steps like installing the APM agent, configuring it with the service name and APM Server URL, etc., as per the docs',
      'Does not provide hallucinated steps, should align with actual Observability documentation',
    ]);

    expect(result.passed).to.be(true);
  });

  after(async () => {
    // Uninstall all installed documentation
    logger.info('Uninstalling Elastic documentation');
    const uninstallResponse = await kibanaClient.callKibana<UninstallResponse>(
      'post',
      {
        pathname: ELASTIC_DOCS_UNINSTALL_ALL_API_PATH,
      },
      {
        inferenceId,
      }
    );

    if (uninstallResponse.data.success) {
      logger.success('Uninstalled Elastic documentation');
    } else {
      logger.error('Could not uninstall Elastic documentation');
    }
  });
});
