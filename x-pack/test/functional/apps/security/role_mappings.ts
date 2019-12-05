/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// see https://w3c.github.io/webdriver/webdriver-spec.html#keyboard-actions
const BKSP_KEY = '\uE003';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'roleMappings']);
  const security = getService('security');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const aceEditor = getService('aceEditor');

  describe('Role Mappings', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('roleMappings');
    });

    it('displays a message when no role mappings exist', async () => {
      await testSubjects.existOrFail('roleMappingsEmptyPrompt');
      await testSubjects.existOrFail('createRoleMappingButton');
    });

    it('allows a role mapping to be created', async () => {
      await testSubjects.click('createRoleMappingButton');
      await testSubjects.setValue('roleMappingFormNameInput', 'new_role_mapping');
      await testSubjects.setValue('roleMappingFormRoleComboBox', 'superuser');
      await browser.pressKeys(browser.keys.ENTER);

      await testSubjects.click('roleMappingsAdvancedRuleEditorButton');

      const container = await testSubjects.find('codeEditorContainer');
      await container.click();

      const input = await find.activeElement();
      await input.type([BKSP_KEY, BKSP_KEY], { charByChar: true }); // delete current content

      input.type(
        JSON.stringify({
          all: [
            {
              field: {
                username: '*',
              },
            },
            {
              field: {
                'metadata.foo.bar': 'baz',
              },
            },
            {
              except: {
                any: [
                  {
                    field: {
                      dn: 'foo',
                    },
                  },
                  {
                    field: {
                      dn: 'bar',
                    },
                  },
                ],
              },
            },
          ],
        }),
        { charByChar: false }
      );

      await testSubjects.click('saveRoleMappingButon');

      await testSubjects.existOrFail('savedRoleMappingSuccessToast');
    });

    it('allows a role mapping to be deleted', async () => {
      await testSubjects.click(`deleteRoleMappingButton-new_role_mapping`);
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('deletedRoleMappingSuccessToast');
    });

    describe('with role mappings', () => {
      const mappings = [
        {
          name: 'a_enabled_role_mapping',
          enabled: true,
          roles: ['superuser'],
          rules: {
            field: {
              username: '*',
            },
          },
          metadata: {},
        },
        {
          name: 'b_disabled_role_mapping',
          enabled: false,
          role_templates: [{ template: { source: 'superuser' } }],
          rules: {
            field: {
              username: '*',
            },
          },
          metadata: {},
        },
      ];

      before(async () => {
        await Promise.all(
          mappings.map(mapping => {
            const { name, ...payload } = mapping;
            return security.roleMappings.create(name, payload);
          })
        );

        await pageObjects.common.navigateToApp('roleMappings');
      });

      after(async () => {
        await Promise.all(mappings.map(mapping => security.roleMappings.delete(mapping.name)));
      });

      it('displays a table of all role mappings', async () => {
        const rows = await testSubjects.findAll('rowMappingRow');
        expect(rows.length).to.eql(mappings.length);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const mapping = mappings[i];

          const name = await testSubjects.findDescendant('roleMappingName', row);
          const enabled =
            (await (
              await testSubjects.findDescendant('roleMappingEnabled', row)
            ).getVisibleText()) === 'Enabled';

          expect(name).to.eql(mapping.name);
          expect(enabled).to.eql(mapping.enabled);
        }
      });

      it('allows a role mapping to be edited', async () => {
        await testSubjects.click('roleMappingName');
        await testSubjects.click('saveRoleMappingButton');
        await testSubjects.existOrFail('savedRoleMappingSuccessToast');
      });
    });
  });
};
