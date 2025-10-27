/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunFn } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import { userInfo } from 'os';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type { HostVm } from '../common/types';
import { createKbnClient } from '../common/stack_services';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  getMultipassVmCountNotice,
  createVm,
  generateVmName,
  findVm,
  getHostVmClient,
  type CreateVmOptions,
} from '../common/vm_services';
import {
  createAgentPolicy,
  enrollHostVmWithFleet,
  fetchAgentPolicyList,
} from '../common/fleet_services';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import { addOsqueryIntegrationToAgentPolicy } from './services/add_osquery_integration';

// Emoji constants for enhanced logging
const EMOJIS = {
  START: '🚀',
  SUCCESS: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  INFO: '📊',
  SHIELD: '🛡️',
  CLOCK: '⏳',
  VM: '💻',
  POLICY: '📋',
  FLEET: '⚓',
};

export const cli = async () => {
  return run(runCli, {
    description: `Sets up Osquery testing environment with Fleet Server, VMs, and Osquery integration.

This script automates the following steps:
1. Ensures Fleet Server is running (starts automatically if needed)
2. Discovers and reuses existing VMs (or creates new ones as needed)
3. Creates agent policies for each VM (reuses existing by default)
4. Creates VMs if needed and enrolls agents with Fleet
   - Parallel VM creation
   - Checks for already-enrolled agents (skips re-enrollment)
   - Parallel agent enrollment with staggered start
5. Adds osquery_manager integration to each policy

VMs and agent policies are automatically reused when found.
To add more VMs, simply increase --vmCount (e.g., from 2 to 5 creates 3 more).
Fleet Server starts automatically if not running.
Use --verbose to see detailed logs for every operation.`,
    flags: {
      string: [
        'kibanaUrl',
        'username',
        'password',
        'version',
        'vmName',
        'apiKey',
        'vmType',
        'vmOs',
        'vmArch',
        'templateVm',
      ],
      number: ['vmCount'],
      boolean: ['verbose', 'staging'],
      default: {
        vmCount: 2,
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        verbose: false,
        vmType: 'multipass',
        vmOs: 'linux',
        vmArch: 'auto',
        staging: false,
      },
      help: `
      --vmCount           Optional. Number of VMs to manage (Default: 2)
                          Increase this number to add more VMs (e.g., 2 → 5 adds 3 more).
                          Existing VMs and policies are automatically reused.
      --vmType            Optional. Type of VM manager to use (Default: multipass)
                          Options: multipass, vagrant, utm
                          - multipass: Linux VMs (default, fastest for Ubuntu)
                          - vagrant: Linux VMs via VirtualBox
                          - utm: Windows/macOS VMs (experimental)
      --vmOs              Optional. Operating system for the VMs (Default: linux)
                          Options: linux, windows, darwin
                          This helps determine the correct agent download.
      --vmArch            Optional. Architecture of the VM (Default: auto)
                          Options: auto, x86_64, arm64
                          - auto: Uses the host machine's architecture
                          - x86_64: Force x86_64/AMD64 agent download
                          - arm64: Force ARM64 agent download
                          Use this if your VM arch differs from your host (e.g., x86 Windows VM on Apple Silicon)
      --templateVm        Optional. Name of existing UTM VM to clone from (required for --vmType utm)
                          List your UTM VMs: /Applications/UTM.app/Contents/MacOS/utmctl list
                          Example: --templateVm "Windows 11"
      --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
      --username          Optional. User name to be used for auth (Default: elastic)
      --password          Optional. Password associated with the username (Default: changeme)
      --version           Optional. The version of the Agent to use for enrolling the new host.
                          Default: uses the same version as the stack (kibana). Version
                          can also be from 'SNAPSHOT'.
                          Examples: 8.6.0, 8.7.0-SNAPSHOT
      --staging           Optional. Use staging builds for testing upcoming releases (Default: false)
                          IMPORTANT: Staging builds are currently hardcoded to version 9.2.0 build 65fce82d
                          Downloads from staging.elastic.co for pre-release testing
                          Example: --staging --version 9.2.0
      --vmName            Optional. Custom prefix for VM names
                          Default: [username]-osquery-[index]-[random]
      --verbose           Optional. Show detailed logs for every operation (Default: false)
                          By default, only summary logs are shown. Use this flag to see individual
                          VM names, policy IDs, and detailed operation logs.
      --apiKey            Optional. A Kibana API key to use for authz. When defined, 'username'
                          and 'password' arguments are ignored.
      `,
    },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  const vmCount = typeof flags.vmCount === 'number' ? flags.vmCount : 2;
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const apiKey = flags.apiKey as string;
  const verbose = flags.verbose as boolean;
  const version = flags.version as string | undefined;
  const vmNamePrefix = flags.vmName as string | undefined;
  const vmType = (flags.vmType as 'multipass' | 'vagrant' | 'utm') || 'multipass';
  const vmOs = (flags.vmOs as 'linux' | 'windows' | 'darwin') || 'linux';
  const vmArch = (flags.vmArch as 'auto' | 'x86_64' | 'arm64') || 'auto';
  const templateVm = flags.templateVm as string | undefined;
  const staging = flags.staging as boolean;

  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  ok(vmCount > 0, 'vmCount must be greater than 0');

  const kbnClient = createKbnClient({
    log,
    url: kibanaUrl,
    username,
    password,
    apiKey,
  });

  const systemUsername = userInfo().username.toLowerCase().replaceAll('.', '-');

  try {
    log.info(`${EMOJIS.START} Starting Osquery onboarding setup...\n`);

    // Phase 1: Fleet Server Validation (Early Check - Fail Fast)
    log.info(`${EMOJIS.FLEET} --- Phase 1: Fleet Server Validation ---`);

    if (!(await isFleetServerRunning(kbnClient, log))) {
      log.info(`${EMOJIS.INFO} Fleet Server not running, starting it automatically...`);

      await startFleetServer({
        kbnClient,
        logger: log,
        force: false,
        version,
      });

      log.info(`${EMOJIS.CLOCK} Waiting for Fleet Server to be fully operational...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      log.info(`${EMOJIS.SUCCESS} Fleet Server is now running\n`);
    } else {
      log.info(`${EMOJIS.SUCCESS} Fleet Server is already running\n`);
    }

    // Phase 2: VM Management and Discovery
    log.info(`${EMOJIS.VM} --- Phase 2: VM Discovery and Management ---`);
    log.info(`${EMOJIS.INFO} Using VM type: ${vmType} (OS: ${vmOs})`);
    const existingVms: HostVm[] = [];

    log.info(`${EMOJIS.CLOCK} Checking for existing Osquery VMs...`);
    const allVmNames = await findVm(vmType, undefined, log);

    // Filter VMs that match our naming pattern: {username}-osquery-{number}(-{random})?
    const osqueryVmPattern = new RegExp(`^${systemUsername}-osquery-\\d+(-\\d+)?$`);
    const matchingVmNames = allVmNames.data.filter((vmName) => osqueryVmPattern.test(vmName));

    if (matchingVmNames.length > 0) {
      log.info(`${EMOJIS.SUCCESS} Found ${matchingVmNames.length} existing Osquery VM(s)`);
      if (verbose) {
        for (const vmName of matchingVmNames) {
          log.info(`  ${EMOJIS.VM} ${vmName}`);
        }
      }
      for (const vmName of matchingVmNames) {
        existingVms.push(
          getHostVmClient(vmName, vmType, undefined, log, vmOs as 'windows' | 'darwin')
        );
      }
      if (verbose) {
        log.info(`${EMOJIS.INFO} These VMs will be reused\n`);
      } else {
        log.info(`${EMOJIS.INFO} VMs will be reused\n`);
      }
    } else {
      log.info(`${EMOJIS.INFO} No existing Osquery VMs found, will create new ones\n`);
    }

    // Phase 3: Agent Policy Creation
    log.info(`${EMOJIS.POLICY} --- Phase 3: Agent Policy Creation ---`);
    const agentPolicies: AgentPolicy[] = [];
    let policiesCreated = 0;
    let policiesReused = 0;

    if (!verbose) {
      log.info(`${EMOJIS.POLICY} Processing ${vmCount} agent policies...`);
    }

    for (let i = 1; i <= vmCount; i++) {
      const policyName = `${systemUsername}-osquery-${i}`;

      if (verbose) {
        log.info(`${EMOJIS.POLICY} Processing agent policy ${i}/${vmCount}: ${policyName}`);
      }

      let policy: AgentPolicy;

      // Check if policy already exists
      const existingPolicies = await fetchAgentPolicyList(kbnClient, {
        kuery: `ingest-agent-policies.name: "${policyName}"`,
      });

      if (existingPolicies.items.length > 0) {
        policy = existingPolicies.items[0];
        if (verbose) {
          log.info(`  ${EMOJIS.SUCCESS} Found existing policy (reusing): ${policy.id}\n`);
        }
        policiesReused++;
        agentPolicies.push(policy);
      } else {
        // Create new policy
        if (verbose) {
          log.info(`  ${EMOJIS.CLOCK} Creating new agent policy...`);
        }
        policy = await createAgentPolicy({
          kbnClient,
          policy: {
            name: policyName,
            description: `Osquery policy ${i} created by run_osquery_host script`,
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
          },
        });
        if (verbose) {
          log.info(`  ${EMOJIS.SUCCESS} Created new policy: ${policy.id}\n`);
        }
        policiesCreated++;

        agentPolicies.push(policy);
      }
    }

    if (!verbose) {
      log.info(
        `${EMOJIS.SUCCESS} ${vmCount} policies ready (${policiesCreated} created, ${policiesReused} reused)\n`
      );
    }

    // Phase 4: VM Creation and Agent Enrollment
    log.info(`${EMOJIS.VM} --- Phase 4: VM Creation and Agent Enrollment ---`);

    // Phase 4a: Parallel VM Creation
    if (!verbose) {
      log.info(`${EMOJIS.CLOCK} Creating ${vmCount} VMs...`);
    } else {
      log.info(`${EMOJIS.CLOCK} Creating ${vmCount} VMs in parallel...`);
    }

    const vmCreationPromises = agentPolicies.map(async (policy, index) => {
      const vmIndex = index + 1;

      try {
        // Check for existing VM reuse
        if (existingVms[index]) {
          if (verbose) {
            log.info(
              `${EMOJIS.VM} VM ${vmIndex}/${vmCount}: Reusing existing VM: ${existingVms[index].name}`
            );
          }
          return {
            success: true as const,
            vm: existingVms[index],
            policy,
            reused: true,
            vmIndex,
          };
        }

        // Create new VM
        const vmIdentifier = `osquery-${vmIndex}`;
        const vmName = vmNamePrefix ? `${vmNamePrefix}-${vmIndex}` : generateVmName(vmIdentifier);

        if (verbose) {
          log.info(`${EMOJIS.VM} VM ${vmIndex}/${vmCount}: Creating new VM: ${vmName}`);
        }

        // Build VM options based on type
        let vmOptions: CreateVmOptions;

        if (vmType === 'utm') {
          vmOptions = {
            type: vmType,
            name: vmName,
            cpus: 1,
            memory: '1G',
            disk: '8G',
            log,
            os: vmOs as 'windows' | 'darwin',
            templateVm,
          };
        } else {
          // For non-UTM types (multipass, vagrant), construct appropriate options
          vmOptions = {
            type: vmType as 'multipass',
            name: vmName,
            cpus: 1,
            memory: '1G',
            disk: '8G',
            log,
          };
        }

        const vm = await createVm(vmOptions);

        if (verbose) {
          log.info(`${EMOJIS.SUCCESS} VM ${vmIndex}/${vmCount} created successfully: ${vmName}`);
        }

        // For Windows VMs, rename the computer to match the VM name
        if (vmOs === 'windows') {
          try {
            if (verbose) {
              log.info(`${EMOJIS.CLOCK} Setting Windows computer hostname to: ${vmName}`);
            }

            // Rename the computer using PowerShell
            const renameCommand = `Rename-Computer -NewName "${vmName}" -Force`;
            await vm.exec(renameCommand);

            if (verbose) {
              log.info(`${EMOJIS.SUCCESS} Rename command executed`);
              log.info(`${EMOJIS.CLOCK} Restarting VM to apply new hostname...`);
            }

            // Restart the computer to apply the new name
            await vm.exec('Restart-Computer -Force');

            // Wait for the VM to shut down and restart
            if (verbose) {
              log.info(`${EMOJIS.CLOCK} Waiting for VM to restart (60 seconds)...`);
            }
            await new Promise((resolve) => setTimeout(resolve, 60000));

            // Wait for the VM to be accessible again
            const maxRetries = 12; // 2 minutes total (12 * 10 seconds)
            let retries = 0;
            let vmReady = false;

            while (retries < maxRetries && !vmReady) {
              try {
                // Test if VM is accessible by running a simple command
                const testResult = await vm.exec('echo "ready"', { silent: true });
                if (testResult.exitCode === 0) {
                  vmReady = true;
                  if (verbose) {
                    log.info(`${EMOJIS.SUCCESS} VM is back online with new hostname`);
                  }
                }
              } catch (error) {
                // VM not ready yet, will retry
              }

              if (!vmReady) {
                retries++;
                if (verbose && retries % 3 === 0) {
                  log.info(`   Waiting for VM to be accessible... (${retries}/${maxRetries})`);
                }
                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds between retries
              }
            }

            if (!vmReady) {
              log.warning(
                `${EMOJIS.WARNING} VM did not come back online within expected time, but continuing anyway...`
              );
            }
          } catch (error) {
            log.warning(`${EMOJIS.WARNING} Error renaming Windows computer: ${error.message}`);
            log.warning(`   Continuing with original hostname...`);
          }
        }

        return { success: true as const, vm, policy, reused: false, vmIndex };
      } catch (error) {
        log.error(`${EMOJIS.ERROR} Failed to create VM ${vmIndex}: ${error.message}`);
        return { success: false as const, error, policy, vmIndex };
      }
    });

    if (!verbose) {
      log.info(`${EMOJIS.CLOCK} Waiting for VM operations to complete...`);
    } else {
      log.info(`${EMOJIS.CLOCK} Waiting for all VM operations to complete...`);
    }
    const vmResults = await Promise.allSettled(vmCreationPromises);

    // Aggregate VM creation results
    const successfulVmCreations = vmResults.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    );
    const failedVmCreations = vmResults.filter(
      (result) =>
        result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );

    log.info(`\n${EMOJIS.INFO} VM Creation Results:`);
    log.info(`   ${EMOJIS.SUCCESS} Successful: ${successfulVmCreations.length}`);
    log.info(`   ${EMOJIS.ERROR} Failed: ${failedVmCreations.length}`);

    if (failedVmCreations.length > 0) {
      log.info(`\n${EMOJIS.WARNING} Failed VM operations:`);
      failedVmCreations.forEach((result) => {
        if (result.status === 'rejected') {
          log.info(`   ${EMOJIS.ERROR} VM creation rejected: ${result.reason}`);
        } else if (result.status === 'fulfilled' && !result.value.success) {
          log.info(`   ${EMOJIS.ERROR} VM ${result.value.vmIndex}: ${result.value.error.message}`);
        }
      });
    }

    // Phase 4b: Parallel Agent Enrollment with Staggered Start
    log.info(`${EMOJIS.START} Checking agent enrollment status...`);

    type EnrollmentResult =
      | {
          success: true;
          vm: HostVm;
          policy: AgentPolicy;
          vmIndex: number;
          alreadyEnrolled?: boolean;
        }
      | { success: false; error: Error; policyName: string; vmIndex: number };

    const enrollmentPromises: Array<Promise<EnrollmentResult>> = [];

    // Create a quieter logger for enrollment operations (suppresses info logs unless verbose)
    const enrollmentLogger = verbose
      ? log
      : {
          ...log,
          info: () => {}, // Suppress info logs in non-verbose mode
          verbose: log.verbose.bind(log),
          debug: log.debug.bind(log),
          warning: log.warning.bind(log),
          error: log.error.bind(log),
          success: log.success ? log.success.bind(log) : log.info.bind(log),
        };

    for (const vmResult of vmResults) {
      if (vmResult.status === 'fulfilled' && vmResult.value.success) {
        const { vm, policy, vmIndex } = vmResult.value;

        const enrollmentPromise = (async () => {
          try {
            // Proceed with enrollment
            await enrollHostVmWithFleet({
              hostVm: vm,
              kbnClient,
              log: enrollmentLogger as typeof log,
              agentPolicyId: policy.id,
              version,
              closestVersionMatch: true,
              useAgentCache: true,
              timeoutMs: 240000, // 4 minutes
              os: vmOs,
              arch: vmArch,
              staging,
            });

            return { success: true as const, vm, policy, vmIndex, alreadyEnrolled: false };
          } catch (error) {
            log.error(
              `${EMOJIS.ERROR} Enrollment failed for Agent ${vmIndex} (${policy.name}): ${error.message}`
            );
            return { success: false as const, error, policyName: policy.name, vmIndex };
          }
        })();

        enrollmentPromises.push(enrollmentPromise);

        // Stagger enrollment starts to avoid overwhelming Fleet Server (2-second delay)
        if (enrollmentPromises.length < successfulVmCreations.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    const enrollmentResults = await Promise.allSettled(enrollmentPromises);

    // Aggregate enrollment results
    const successfulEnrollments = enrollmentResults.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    );
    const failedEnrollments = enrollmentResults.filter(
      (result) =>
        result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );

    // Count already enrolled vs newly enrolled
    const alreadyEnrolledCount = successfulEnrollments.filter(
      (result) =>
        result.status === 'fulfilled' &&
        result.value.success &&
        result.value.alreadyEnrolled === true
    ).length;
    const newlyEnrolledCount = successfulEnrollments.length - alreadyEnrolledCount;

    if (successfulEnrollments.length === vmCount) {
      if (alreadyEnrolledCount > 0 && newlyEnrolledCount > 0) {
        log.info(
          `${EMOJIS.SUCCESS} ${successfulEnrollments.length}/${vmCount} agents ready (${alreadyEnrolledCount} already enrolled, ${newlyEnrolledCount} newly enrolled)`
        );
      } else if (alreadyEnrolledCount === successfulEnrollments.length) {
        log.info(
          `${EMOJIS.SUCCESS} ${successfulEnrollments.length}/${vmCount} agents ready (all already enrolled)`
        );
      } else {
        log.info(
          `${EMOJIS.SUCCESS} ${successfulEnrollments.length}/${vmCount} agents enrolled successfully`
        );
      }
    } else {
      log.info(
        `${EMOJIS.WARNING} ${successfulEnrollments.length}/${vmCount} agents ready (${failedEnrollments.length} failed)`
      );
    }

    if (failedEnrollments.length > 0) {
      log.info(`\n${EMOJIS.WARNING} Failed enrollments:`);
      failedEnrollments.forEach((result) => {
        if (result.status === 'rejected') {
          log.info(`   ${EMOJIS.ERROR} Enrollment rejected: ${result.reason}`);
        } else if (result.status === 'fulfilled' && !result.value.success) {
          log.info(
            `   ${EMOJIS.ERROR} Agent ${result.value.vmIndex} (${result.value.policyName}): ${result.value.error.message}`
          );
        }
      });
    }

    // Collect successfully enrolled VMs
    const vms: HostVm[] = [];
    for (const result of enrollmentResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        vms.push(result.value.vm);
      }
    }

    // Overall status check
    if (successfulEnrollments.length === 0) {
      throw new Error(`${EMOJIS.ERROR} Setup failed - no VMs could be created and enrolled`);
    } else if (successfulEnrollments.length < vmCount && !verbose) {
      log.warning(
        `${EMOJIS.WARNING} Continuing with ${successfulEnrollments.length}/${vmCount} operational VMs`
      );
    }

    // Phase 5: Add Osquery Integration
    log.info(`\n${EMOJIS.SHIELD} --- Phase 5: Adding Osquery Integration ---`);

    // Only add integration to policies with successfully enrolled agents
    const policiesToIntegrate = agentPolicies.filter((policy, index) => {
      const enrollmentResult = enrollmentResults[index];
      return enrollmentResult?.status === 'fulfilled' && enrollmentResult.value.success;
    });

    if (!verbose) {
      log.info(
        `${EMOJIS.CLOCK} Adding Osquery integration to ${policiesToIntegrate.length} policies...`
      );
    }

    let integrationSuccessCount = 0;
    let integrationFailureCount = 0;

    for (let i = 0; i < policiesToIntegrate.length; i++) {
      const policy = policiesToIntegrate[i];
      try {
        if (verbose) {
          log.info(
            `${EMOJIS.SHIELD} Adding integration ${i + 1}/${policiesToIntegrate.length}: ${
              policy.name
            }`
          );
        }

        await addOsqueryIntegrationToAgentPolicy({
          kbnClient,
          log,
          agentPolicyId: policy.id,
        });

        if (verbose) {
          log.info(`  ${EMOJIS.SUCCESS} Integration added successfully\n`);
        }
        integrationSuccessCount++;
      } catch (error) {
        log.error(`  ${EMOJIS.ERROR} Failed to add integration: ${error.message}\n`);
        integrationFailureCount++;
      }
    }

    if (integrationSuccessCount === policiesToIntegrate.length) {
      log.info(
        `${EMOJIS.SUCCESS} ${integrationSuccessCount}/${policiesToIntegrate.length} integrations added successfully`
      );
    } else {
      log.info(
        `${EMOJIS.WARNING} ${integrationSuccessCount}/${policiesToIntegrate.length} integrations added (${integrationFailureCount} failed)`
      );
    }

    // Final Summary
    log.info(`\n${'='.repeat(70)}`);
    log.info(`${EMOJIS.SUCCESS} SETUP COMPLETE!`);
    log.info('='.repeat(70));

    // Overall summary statistics
    log.info(`\n${EMOJIS.INFO} Overall Summary:`);
    log.info(`   ${EMOJIS.VM} Total VMs requested: ${vmCount}`);
    log.info(`   ${EMOJIS.SUCCESS} VMs created: ${successfulVmCreations.length}`);
    log.info(`   ${EMOJIS.SUCCESS} Agents enrolled: ${successfulEnrollments.length}`);
    log.info(`   ${EMOJIS.SUCCESS} Integrations added: ${integrationSuccessCount}`);

    if (
      failedVmCreations.length > 0 ||
      failedEnrollments.length > 0 ||
      integrationFailureCount > 0
    ) {
      log.info(`\n${EMOJIS.WARNING} Issues Encountered:`);
      if (failedVmCreations.length > 0) {
        log.info(`   ${EMOJIS.ERROR} VM creation failures: ${failedVmCreations.length}`);
      }
      if (failedEnrollments.length > 0) {
        log.info(`   ${EMOJIS.ERROR} Enrollment failures: ${failedEnrollments.length}`);
      }
      if (integrationFailureCount > 0) {
        log.info(`   ${EMOJIS.ERROR} Integration failures: ${integrationFailureCount}`);
      }
    }

    if (verbose) {
      log.info(`\n${EMOJIS.VM} Virtual Machines:`);
      vms.forEach((vm, index) => {
        log.info(`\n${EMOJIS.SUCCESS} ${index + 1}. ${vm.name}`);
        log.info(vm.info());
      });

      log.info(`\n${EMOJIS.POLICY} Agent Policies:`);
      policiesToIntegrate.forEach((policy) => {
        log.info(`  ${EMOJIS.SUCCESS} ${policy.name} (ID: ${policy.id})`);
      });
    }

    log.info(`\n${EMOJIS.INFO} Quick Links:`);
    log.info(`   ${EMOJIS.SHIELD} Osquery UI: ${kibanaUrl}/app/osquery`);
    log.info(`   ${EMOJIS.FLEET} Fleet UI: ${kibanaUrl}/app/fleet`);

    log.info(`\n${EMOJIS.INFO} Next Steps:`);
    log.info(`   1. Visit the Osquery UI to view and execute queries`);
    log.info(`   2. Check Fleet UI to see your enrolled agents`);
    log.info(`   3. Default test queries are already configured in the integration`);

    const vmNotice = await getMultipassVmCountNotice(vms.length);
    if (vmNotice) {
      log.info(`\n${EMOJIS.WARNING} ${vmNotice}`);
    }

    log.info(`\n${'='.repeat(70)}`);
  } catch (error) {
    log.error(`\n${'='.repeat(70)}`);
    log.error(`${EMOJIS.ERROR} SETUP FAILED`);
    log.error('='.repeat(70));
    log.error(`\n${EMOJIS.ERROR} Error: ${error.message}`);
    if (error.stack) {
      log.error(`\n${EMOJIS.INFO} Stack trace:\n${error.stack}`);
    }
    log.error(`\n${EMOJIS.WARNING} Troubleshooting tips:`);
    log.error(`   1. ${EMOJIS.INFO} Ensure Kibana and Elasticsearch are running`);
    log.error(
      `   2. ${EMOJIS.VM} Check that multipass is installed (macOS: brew install multipass)`
    );
    log.error(`   3. ${EMOJIS.INFO} Verify network connectivity to Kibana and Fleet Server`);
    log.error(`   4. ${EMOJIS.INFO} Check Kibana logs for additional error details`);
    log.error(
      `   5. ${EMOJIS.FLEET} Try running with --forceFleetServer if Fleet Server issues occur`
    );
    log.error(
      `   6. ${EMOJIS.VM} Try running with --forceNewVms to recreate VMs if reuse is causing issues`
    );
    log.error(`   7. ${EMOJIS.INFO} Check system resources (CPU, memory, disk) for multipass`);
    throw error;
  }
};
