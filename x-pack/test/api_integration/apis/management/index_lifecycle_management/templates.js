/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { initElasticsearchHelpers, getRandomString } from './lib';
import { getTemplatePayload, getPolicyPayload } from './fixtures';
import { registerHelpers as registerTemplatesHelpers } from './templates.helpers';
import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const { createIndexTemplate, cleanUp: cleanUpEsResources } = initElasticsearchHelpers(es);

  const { loadTemplates, addPolicyToTemplate } = registerTemplatesHelpers({
    supertest,
  });

  const { createPolicy, cleanUp: cleanUpPolicies } = registerPoliciesHelpers({ supertest });

  describe('templates', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpPolicies()]));

    describe('list', () => {
      it('should load all the templates', async () => {
        // Create a template with the ES client
        const templateName = getRandomString();
        await createIndexTemplate(templateName, getTemplatePayload());

        // Load the templates and verify that our new template is in the list
        const { body } = await loadTemplates().expect(200);
        expect(body.map((t) => t.name)).to.contain(templateName);
      });

      it('should filter out the system template whose index patterns does not contain wildcard', async () => {
        // system template start witht a "."
        const templateName = `.${getRandomString()}`;
        const template = getTemplatePayload();
        await createIndexTemplate(templateName, { ...template, index_patterns: ['no-wildcard'] });

        // Load the templates and verify that our new template is **not** in the list
        const { body } = await loadTemplates().expect(200);
        expect(body.map((t) => t.name)).not.to.contain(templateName);
      });
    });

    describe('update', () => {
      it('should add a policy to a template', async () => {
        // Create policy
        const policy = getPolicyPayload('template-test-policy');
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create template
        const templateName = getRandomString();
        const template = getTemplatePayload();
        await createIndexTemplate(templateName, template);

        const rolloverAlias = getRandomString();

        // Attach policy to template
        await addPolicyToTemplate(templateName, policyName, rolloverAlias).expect(200);

        // Fetch the template and verify that the policy has been attached
        const { body } = await loadTemplates();
        const fetchedTemplate = body.find(({ name }) => templateName === name);
        const {
          settings: {
            index: { lifecycle },
          },
        } = fetchedTemplate;
        expect(lifecycle.name).to.equal(policyName);
        expect(lifecycle.rollover_alias).to.equal(rolloverAlias);
      });
    });
  });
}
