/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

import {
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../../plugins/fleet/common';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  function withTestPackageVersion(version: string) {
    before(async function () {
      await supertest
        .post(`/api/fleet/epm/packages/package_policy_upgrade/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async function () {
      await supertest
        .delete(`/api/fleet/epm/packages/package_policy_upgrade/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
  }

  describe('Package Policy - upgrade', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      await getService('esArchiver').unload('x-pack/test/functional/es_archives/empty_kibana');
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    setupFleetAndAgents(providerContext);

    describe('when package version is not installed', function () {
      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.1.0',
            },
          })
          .expect(200);

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        withTestPackageVersion('0.2.0-add-non-required-test-var');
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
              packageVersion: '0.2.0-add-non-required-test-var',
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].diff?.length).to.be(2);
          expect(body[0].agent_diff?.length).to.be(1);
          expect(body[0].hasErrors).to.be(false);

          const [currentPackagePolicy, proposedPackagePolicy] = body[0].diff ?? [];

          expect(currentPackagePolicy?.package?.version).to.be('0.1.0');
          expect(proposedPackagePolicy?.package?.version).to.be('0.2.0-add-non-required-test-var');
        });
      });

      describe('upgrade', function () {
        withTestPackageVersion('0.2.0-add-non-required-test-var');
        it('should respond with an error', async function () {
          // upgrade policy to 0.2.0
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          // downgrade package
          await supertest
            .post(`/api/fleet/epm/packages/package_policy_upgrade/0.1.0`)
            .set('kbn-xsrf', 'xxxx')
            .send({ force: true })
            .expect(200);

          // try upgrade policy to 0.1.0: error
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(400);
        });
      });
    });

    describe('when upgrading to a version with no breaking changes', function () {
      withTestPackageVersion('0.2.5-non-breaking-change');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {
                      test_var: {
                        value: 'My custom test value',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.2.0-add-non-required-test-var',
            },
          })
          .expect(200);

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].diff?.length).to.be(2);
          expect(body[0].agent_diff?.length).to.be(1);
          expect(body[0].hasErrors).to.be(false);

          const [currentPackagePolicy, proposedPackagePolicy] = body[0].diff ?? [];

          expect(currentPackagePolicy?.package?.version).to.be('0.2.0-add-non-required-test-var');
          expect(proposedPackagePolicy?.package?.version).to.be('0.2.5-non-breaking-change');

          const testInput = proposedPackagePolicy?.inputs.find(({ type }) => type === 'test_input');
          const testStream = testInput?.streams[0];

          expect(testStream?.vars?.test_var.value).to.be('My custom test value');
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when upgrading to a version where a non-required variable has been added', function () {
      withTestPackageVersion('0.2.0-add-non-required-test-var');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.1.0',
            },
          })
          .expect(200);

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].diff?.length).to.be(2);
          expect(body[0].agent_diff?.length).to.be(1);
          expect(body[0].hasErrors).to.be(false);

          const [currentPackagePolicy, proposedPackagePolicy] = body[0].diff ?? [];

          expect(currentPackagePolicy?.package?.version).to.be('0.1.0');
          expect(proposedPackagePolicy?.package?.version).to.be('0.2.0-add-non-required-test-var');
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when upgrading to a version where a variable has been removed', function () {
      withTestPackageVersion('0.3.0-remove-test-var');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {
                      test_var: {
                        value: 'Test Value',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.2.0-add-non-required-test-var',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].diff?.length).to.be(2);
          expect(body[0].agent_diff?.length).to.be(1);
          expect(body[0].hasErrors).to.be(false);
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body.length).to.be(1);
          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when upgrading to a version where a required variable has been added', function () {
      withTestPackageVersion('0.4.0-add-test-var-as-bool');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {},
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.3.0-remove-test-var',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a diff with errors', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].hasErrors).to.be(true);
        });
      });

      describe('upgrade', function () {
        it('fails to upgrade package policy', async function () {
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(400);
        });
      });
    });

    describe('when upgrading to a version where a variable has changed types', function () {
      withTestPackageVersion('0.4.0-add-test-var-as-bool');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {
                      test_var: {
                        value: 'Test value',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.2.0-add-non-required-test-var',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a diff with errors', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].hasErrors).to.be(true);
        });
      });

      describe('upgrade', function () {
        it('fails to upgrade package policy', async function () {
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(400);
        });
      });
    });

    describe('when upgrading to a version where inputs have been restructured', function () {
      withTestPackageVersion('0.5.0-restructure-inputs');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {
                      test_var: {
                        value: 'Test value',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.2.0-add-non-required-test-var',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].hasErrors).to.be(false);
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when upgrading to a version where policy templates have been restructured', function () {
      withTestPackageVersion('0.6.0-restructure-policy-templates');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input_new',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream_new',
                      dataset: 'package_policy_upgrade.test_stream_new',
                    },
                    vars: {
                      test_var_new: {
                        value: 'Test value 1',
                      },
                      test_var_new_2: {
                        value: 'Test value 2',
                      },
                    },
                  },
                ],
              },
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input_new_2',
                enabled: true,
                vars: {},
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream_new_2',
                      dataset: 'package_policy_upgrade.test_stream_new_2',
                    },
                    vars: {
                      test_input_new_2_var_1: {
                        value: 'Test input value 1',
                      },
                      test_input_new_2_var_2: {
                        value: 'Test input value 2',
                      },
                      test_var_new_2_var_1: {
                        value: 'Test value 1',
                      },
                      test_var_new_2_var_2: {
                        value: 'Test value 2',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.5.0-restructure-inputs',
            },
          });
        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].hasErrors).to.be(false);
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when upgrading to a version where an input with no variables has variables added', function () {
      withTestPackageVersion('0.8.0-add-vars-to-stream-with-no-vars');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.7.0-add-stream-with-no-vars',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('returns a valid diff', async function () {
          const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].hasErrors).to.be(false);

          const oldInput = body[0].diff?.[0].inputs.find((input) => input.type === 'test_input');
          const oldStream = oldInput?.streams.find(
            (stream) => stream.data_stream.dataset === 'package_policy_upgrade.test_stream'
          );

          expect(oldStream?.vars).to.be(undefined);

          const newInput = body[0].diff?.[1].inputs.find((input) => input.type === 'test_input');
          const newStream = newInput?.streams.find(
            (stream) => stream.data_stream.dataset === 'package_policy_upgrade.test_stream'
          );

          expect(newStream?.vars).to.eql({
            test_var_new: {
              value: 'Test Var New',
              type: 'text',
            },
            test_var_new_2: {
              value: 'Test Var New 2',
              type: 'text',
            },
          });
        });
      });

      describe('upgrade', function () {
        it('successfully upgrades package policy', async function () {
          const { body }: { body: UpgradePackagePolicyResponse } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);

          expect(body[0].success).to.be(true);
        });
      });
    });

    describe('when package policy is not found', function () {
      it('should return an 200 with errors when performing a dryrun', async function () {
        await supertest
          .post(`/api/fleet/package_policies/upgrade/dryrun`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: ['xxxx', 'yyyy'],
          })
          .expect(404);
      });

      it('should return a 200 with errors and "success:false" when trying to upgrade', async function () {
        await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: ['xxxx', 'yyyy'],
          })
          .expect(404);
      });
    });

    describe("when policy's package version is up to date", function () {
      withTestPackageVersion('0.1.0');

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.1.0',
            },
          })
          .expect(200);

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('dry run', function () {
        it('should respond with a 200 ok', async function () {
          await supertest
            .post(`/api/fleet/package_policies/upgrade/dryrun`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
              packageVersion: '0.1.0',
            })
            .expect(200);
        });
      });

      describe('upgrade', function () {
        it('should respond with a 200 ok', async function () {
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);
        });
      });
    });
  });
}
