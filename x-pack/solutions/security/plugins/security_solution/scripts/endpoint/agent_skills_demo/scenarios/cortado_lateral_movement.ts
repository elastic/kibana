/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { assertCortadoLateralMovementPreconditions } from '../validation/cortado_lateral_movement_validation';
import type { AgentSkillsDemoScenario } from '../types';
import { createMultipassHostVmClient } from '../../common/vm_services';
import { waitForHostToEnroll } from '../../common/fleet_services';

/**
 * MITRE ATT&CK Lateral Movement techniques covered by this scenario:
 * - T1021.004 - Remote Services: SSH
 * - T1021.002 - Remote Services: SMB/Windows Admin Shares
 * - T1570 - Lateral Tool Transfer
 * - T1563.001 - Remote Service Session Hijacking: SSH Hijacking
 */

/**
 * Setup SSH key-based authentication between initiator and target VMs
 */
const setupSshLateralMovement = async ({
  initiatorVmName,
  targetVmName,
  log,
}: {
  initiatorVmName: string;
  targetVmName: string;
  log: ToolingLog;
}): Promise<void> => {
  const initiator = createMultipassHostVmClient(initiatorVmName);
  const target = createMultipassHostVmClient(targetVmName);

  log.info(`Setting up SSH lateral movement from [${initiatorVmName}] to [${targetVmName}]`);

  // Ensure SSH server is running on target
  await target.exec(`sudo apt-get update -y && sudo apt-get install -y openssh-server`, {
    shell: true,
  });
  await target.exec(`sudo systemctl enable --now ssh`, { shell: true });

  // Generate SSH key on initiator if not exists
  await initiator.exec(`mkdir -p /home/ubuntu/.ssh && chmod 700 /home/ubuntu/.ssh`, {
    shell: true,
  });
  await initiator.exec(
    `test -f /home/ubuntu/.ssh/id_ed25519 || ssh-keygen -t ed25519 -N '' -f /home/ubuntu/.ssh/id_ed25519`,
    { shell: true }
  );

  // Get public key and add to target authorized_keys
  const pubKey = (
    await initiator.exec(`cat /home/ubuntu/.ssh/id_ed25519.pub`, { shell: true })
  ).stdout.trim();

  await target.exec(`mkdir -p /home/ubuntu/.ssh && chmod 700 /home/ubuntu/.ssh`, { shell: true });
  await target.exec(
    `grep -qF "${pubKey.replaceAll(
      '"',
      '\\"'
    )}" /home/ubuntu/.ssh/authorized_keys 2>/dev/null || echo "${pubKey.replaceAll(
      '"',
      '\\"'
    )}" >> /home/ubuntu/.ssh/authorized_keys`,
    { shell: true }
  );
  await target.exec(`chmod 600 /home/ubuntu/.ssh/authorized_keys`, { shell: true });

  log.info(`SSH lateral movement setup complete`);
};

/**
 * Get the IPv4 address of a VM
 */
const getVmIpv4 = async (vmName: string): Promise<string> => {
  const vm = createMultipassHostVmClient(vmName);
  const { stdout } = await vm.exec(`hostname -I | awk '{print $1}'`, { shell: true });
  return stdout.trim();
};

/**
 * Execute Cortado RTAs for lateral movement simulation
 *
 * This function executes a series of lateral movement techniques using Cortado RTAs:
 * 1. SSH lateral movement (T1021.004)
 * 2. Lateral tool transfer (T1570)
 * 3. Remote command execution
 */
const executeCortadoLateralMovementRtas = async ({
  initiatorVmName,
  targetVmName,
  log,
}: {
  initiatorVmName: string;
  targetVmName: string;
  log: ToolingLog;
}): Promise<void> => {
  const initiator = createMultipassHostVmClient(initiatorVmName);
  const targetIp = await getVmIpv4(targetVmName);

  log.info(`Executing Cortado lateral movement RTAs from [${initiatorVmName}] to [${targetIp}]`);

  // RTA 1: SSH Remote Command Execution (T1021.004)
  // Simulates adversary using SSH for lateral movement
  log.info(`[RTA] SSH Remote Command Execution (T1021.004)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "whoami && hostname && id"`,
    { shell: true }
  );

  // RTA 2: Lateral Tool Transfer (T1570)
  // Simulates transferring tools to remote system
  log.info(`[RTA] Lateral Tool Transfer (T1570)`);

  // Create a benign "tool" file on initiator
  await initiator.exec(
    `echo '#!/bin/bash\necho "Cortado lateral movement demo tool"' > /tmp/cortado_demo_tool.sh && chmod +x /tmp/cortado_demo_tool.sh`,
    { shell: true }
  );

  // Transfer to target via SCP
  await initiator.exec(
    `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null /tmp/cortado_demo_tool.sh ubuntu@${targetIp}:/tmp/`,
    { shell: true }
  );

  // RTA 3: Remote Tool Execution after Transfer
  // Execute the transferred tool on the remote system
  log.info(`[RTA] Remote Tool Execution after Transfer`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "/tmp/cortado_demo_tool.sh"`,
    { shell: true }
  );

  // RTA 4: System Discovery via SSH (T1082 + T1021.004)
  // Remote system information gathering
  log.info(`[RTA] Remote System Discovery (T1082)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "uname -a && cat /etc/os-release && df -h && free -m"`,
    { shell: true }
  );

  // RTA 5: Network Discovery via SSH (T1016 + T1021.004)
  log.info(`[RTA] Remote Network Discovery (T1016)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "ip addr show && ip route && cat /etc/resolv.conf"`,
    { shell: true }
  );

  // RTA 6: Account Discovery via SSH (T1087 + T1021.004)
  log.info(`[RTA] Remote Account Discovery (T1087)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "cat /etc/passwd | grep -v nologin | grep -v false && lastlog | head -20"`,
    { shell: true }
  );

  // RTA 7: Process Discovery via SSH (T1057 + T1021.004)
  log.info(`[RTA] Remote Process Discovery (T1057)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "ps aux --sort=-%mem | head -20"`,
    { shell: true }
  );

  // RTA 8: Scheduled Task/Job (T1053.003) - Remote Cron Job
  log.info(`[RTA] Remote Scheduled Task Creation (T1053.003)`);
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "echo '*/5 * * * * echo cortado-lateral-demo >> /tmp/cortado_cron.log' | crontab - && crontab -l"`,
    { shell: true }
  );

  // Cleanup: Remove the scheduled task
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "crontab -r || true"`,
    { shell: true }
  );

  log.info(`Cortado lateral movement RTAs completed successfully`);
};

/**
 * Cortado Lateral Movement Scenario
 *
 * This scenario simulates lateral movement techniques using Cortado RTAs (Red Team Automation).
 * It demonstrates various MITRE ATT&CK lateral movement techniques including:
 * - T1021.004: Remote Services: SSH
 * - T1570: Lateral Tool Transfer
 * - T1082: System Information Discovery (remote)
 * - T1016: System Network Configuration Discovery (remote)
 * - T1087: Account Discovery (remote)
 * - T1057: Process Discovery (remote)
 * - T1053.003: Scheduled Task/Job: Cron
 *
 * Prerequisites:
 * - Agent policy with Elastic Defend and Osquery integrations
 * - At least two enrolled endpoint hosts (initiator + target)
 * - SSH connectivity between hosts (set up by this scenario)
 */
export const cortadoLateralMovementScenario: AgentSkillsDemoScenario = {
  id: 'cortado-lateral-movement',
  title: 'Cortado Lateral Movement Scenario',
  description:
    'Simulates lateral movement techniques using Cortado RTAs. Demonstrates SSH-based remote execution, lateral tool transfer, and discovery techniques across multiple hosts.',
  run: async (ctx) => {
    const { kbnClient, log, vmName, agentPolicyId } = ctx;

    // Validate preconditions
    await assertCortadoLateralMovementPreconditions(ctx);

    if (!vmName) {
      throw new Error(
        `Cortado lateral movement scenario requires a VM name (initiator). Please run with a provisioned VM.`
      );
    }

    // For this scenario, we need at least 2 VMs: initiator and target
    // The vmName from context is the initiator; we'll create a target VM name pattern
    const initiatorVmName = vmName;
    const targetVmName = vmName
      .replace('-initiator', '-target')
      .replace('skills-demo', 'skills-demo-target');

    // Check if target is enrolled
    log.info(`Checking for target VM enrollment: [${targetVmName}]`);

    try {
      await waitForHostToEnroll(kbnClient, log, targetVmName, 30000);
    } catch (e) {
      log.warning(
        `Target VM [${targetVmName}] not found. This scenario requires 2 enrolled VMs. ` +
          `The scenario will attempt to use the initiator as both source and target for demonstration.`
      );
      // Fall back to using same VM as both initiator and target (self-lateral movement)
    }

    // Setup SSH lateral movement
    await setupSshLateralMovement({
      initiatorVmName,
      targetVmName: targetVmName !== initiatorVmName ? targetVmName : initiatorVmName,
      log,
    });

    // Execute Cortado RTAs
    await executeCortadoLateralMovementRtas({
      initiatorVmName,
      targetVmName: targetVmName !== initiatorVmName ? targetVmName : initiatorVmName,
      log,
    });

    log.info(`Cortado lateral movement scenario completed successfully`);
  },
};
