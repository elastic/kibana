/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { EXECUTE_CONNECTOR_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/execute_connector';
import { chatClient, kibanaClient, logger } from '../../services';

const EMAIL_PROMPT =
  'Send an email to user@test.com with the subject "Test Email" and body "This is a test email."';

const EMAIL_EVAL_CRITERIA = [
  `Uses the ${EXECUTE_CONNECTOR_FUNCTION_NAME} function to send the email before providing a final answer to the user.`,
  'Clearly explains to the user that an email will be sent and summarizes the provided details (recipient, subject, body).',
  'Confirms successful email delivery and includes the recipient, subject, and message in the summary.',
  'Does not include irrelevant or unrelated information in the response.',
];

/**
 * Helper to set user instructions
 */
async function setUserInstructions(text: string) {
  await kibanaClient.callKibana(
    'PUT',
    {
      pathname: '/internal/observability_ai_assistant/kb/user_instructions',
    },
    {
      id: 'send_email',
      text,
      public: false,
    }
  );
}

describe('execute_connector function', () => {
  describe('no connectors available', () => {
    it('does not send an email and fails gracefully', async () => {
      const conversation = await chatClient.complete({ messages: EMAIL_PROMPT });
      const result = await chatClient.evaluate(conversation, [
        `Does not use ${EXECUTE_CONNECTOR_FUNCTION_NAME} function.`,
        'Explains that no connectors are available to send the email.',
        'Does not attempt to send an email.',
        'Mentions that sending the email was unsuccessful.',
      ]);
      expect(result.passed).to.be(true);
    });
  });

  describe('with email connector', () => {
    let emailConnectorId: string;
    before(async () => {
      const emailConnectorResponse = await kibanaClient.callKibana(
        'POST',
        { pathname: 'api/actions/connector' },
        {
          name: 'email-connector-test',
          config: {
            from: 'test@example.com',
            service: '__json',
          },
          secrets: {
            user: 'test',
            password: '123456',
          },
          connector_type_id: '.email',
        }
      );
      logger.success('Email connector created successfully');
      const emailData = emailConnectorResponse.data as { id: string };
      emailConnectorId = emailData.id;
      const connectors = await kibanaClient.callKibana('GET', {
        pathname: '/api/actions/connectors',
      });
      logger.debug('Available connectors:', connectors.data);
    });

    it('sends an email (basic)', async () => {
      const conversation = await chatClient.complete({ messages: EMAIL_PROMPT });
      const result = await chatClient.evaluate(conversation, EMAIL_EVAL_CRITERIA);
      expect(result.passed).to.be(true);
    });

    it('sends an email using user instructions', async () => {
      await setUserInstructions(`<email_instructions>
      If the user's query requires sending an email:
      1. Use the email connector type ".email" with ID "${emailConnectorId}".
      2. Prepare the email parameters:
        - Recipient email address(es) in the "to" field (array of strings)
        - Subject in the "subject" field (string)
        - Email body in the "message" field (string)
      3. Include
      - Details for the alert along with a link to the alert
      - Root cause analysis
      - All of the details we discussed in this conversation
      - Remediation recommendations
      - Link to Business Health Dashboard
      4. Execute the connector using this format:
        execute_connector(
          id="${emailConnectorId}",
          params={
            "to": ["recipient@example.com"],
            "subject": "Your Email Subject",
            "message": "Your email content here."
          }
        )
      5. Check the response and confirm if the email was sent successfully.
  </email_instructions>`);

      const conversation = await chatClient.complete({ messages: EMAIL_PROMPT });

      const result = await chatClient.evaluate(conversation, EMAIL_EVAL_CRITERIA);
      expect(result.passed).to.be(true);
    });

    after(async () => {
      // Delete the email connector
      await kibanaClient.callKibana('DELETE', {
        pathname: `/api/actions/connector/${emailConnectorId}`,
      });
      logger.success('Email connector deleted');
    });
  });
});
