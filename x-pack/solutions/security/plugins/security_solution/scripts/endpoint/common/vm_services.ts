/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import chalk from 'chalk';
import path from 'path';
import { userInfo } from 'os';
import { unlink as deleteFile } from 'fs/promises';
import { dump } from './utils';
import type { DownloadedAgentInfo } from './agent_downloads_service';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import type { HostVm, HostVmExecResponse, SupportedVmManager } from './types';

const baseGenerator = new BaseDataGenerator();
export const DEFAULT_VAGRANTFILE = path.join(__dirname, 'vagrant', 'Vagrantfile');

const MAX_BUFFER = 1024 * 1024 * 5; // 5MB

export interface BaseVmCreateOptions {
  name: string;
  /** Number of CPUs */
  cpus?: number;
  /** Disk size */
  disk?: string;
  /** Amount of memory */
  memory?: string;
}

export type CreateVmOptions =
  | CreateMultipassVmOptions
  | CreateVagrantVmOptions
  | CreateUtmVmOptions;

/**
 * Creates a new VM
 */
export const createVm = async (options: CreateVmOptions): Promise<HostVm> => {
  if (options.type === 'multipass') {
    return createMultipassVm(options);
  }

  if (options.type === 'utm') {
    return createUtmVm(options);
  }

  return createVagrantVm(options);
};

interface CreateMultipassVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'multipass';
  name: string;
  log?: ToolingLog;
  /** Image to use for creating the VM */
  image?: string;
}

const createMultipassVm = async ({
  name,
  disk = '8G',
  cpus = 1,
  memory = '1G',
  image = '',
  log = createToolingLogger(),
}: CreateMultipassVmOptions): Promise<HostVm> => {
  log.info(`Creating VM [${name}] using multipass`);

  const createResponse = await execa.command(
    `multipass launch --name ${name} --disk ${disk} --cpus ${cpus} --memory ${memory}${
      image ? ` ${image}` : ''
    }`
  );

  log.verbose(`VM [${name}] created successfully using multipass.`, createResponse);

  return createMultipassHostVmClient(name, log);
};

/**
 * Creates a standard client for interacting with a Multipass VM
 * @param name
 * @param log
 */
export const createMultipassHostVmClient = (
  name: string,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  const exec = async (
    command: string,
    options?: { silent?: boolean }
  ): Promise<HostVmExecResponse> => {
    const execResponse = await execa
      .command(`multipass exec ${name} -- ${command}`, { maxBuffer: MAX_BUFFER })
      .catch((e) => {
        if (!options?.silent) {
          log.error(dump(e));
        }
        throw e;
      });

    log.verbose(
      `exec response from host [${name}] for command [${command}]:\n${dump(execResponse)}`
    );

    return {
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      exitCode: execResponse.exitCode,
    };
  };

  const destroy = async (): Promise<void> => {
    const destroyResponse = await execa.command(`multipass delete -p ${name}`);
    log.verbose(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using Multipass.
  VM Name: ${name}

  Shell access: ${chalk.cyan(`multipass shell ${name}`)}
  Delete VM:    ${chalk.cyan(`multipass delete -p ${name}`)}
`;
  };

  const unmount = async (hostVmDir: string) => {
    const response = await execa.command(`multipass unmount ${name}:${hostVmDir}`);
    log.verbose(`multipass unmount response:\n`, response);
  };

  const mount = async (localDir: string, hostVmDir: string) => {
    const response = await execa.command(`multipass mount ${localDir} ${name}:${hostVmDir}`);
    log.verbose(`multipass mount response:\n`, response);

    return {
      hostDir: hostVmDir,
      unmount: () => unmount(hostVmDir),
    };
  };

  const start = async () => {
    const response = await execa.command(`multipass start ${name}`);
    log.verbose(`multipass start response:\n`, response);
  };

  const stop = async () => {
    const response = await execa.command(`multipass stop ${name}`);
    log.verbose(`multipass stop response:\n`, response);
  };

  const upload: HostVm['upload'] = async (localFilePath, destFilePath) => {
    const response = await execa.command(
      `multipass transfer ${localFilePath} ${name}:${destFilePath}`
    );
    log.verbose(`Uploaded file to VM [${name}]:`, response);

    return {
      filePath: destFilePath,
      delete: async () => {
        return exec(`rm ${destFilePath}`);
      },
    };
  };

  const download: HostVm['download'] = async (vmFilePath: string, localFilePath: string) => {
    const localFileAbsolutePath = path.resolve(localFilePath);
    const response = await execa.command(
      `multipass transfer ${name}:${vmFilePath} ${localFilePath}`
    );
    log.verbose(`Downloaded file from VM [${name}]:`, response);

    return {
      filePath: localFileAbsolutePath,
      delete: async () => {
        return deleteFile(localFileAbsolutePath).then(() => {
          return {
            stdout: 'success',
            stderr: '',
            exitCode: 0,
          };
        });
      },
    };
  };

  return {
    type: 'multipass',
    name,
    exec,
    destroy,
    info,
    mount,
    unmount,
    transfer: upload,
    upload,
    download,
    start,
    stop,
  };
};

// ==================== UTM VM Manager ====================

const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';

interface CreateUtmVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'utm';
  name: string;
  log?: ToolingLog;
  /** OS type for the VM */
  os: 'windows' | 'darwin' | 'linux';
  /** UTM VM name to clone from (must exist in UTM) */
  templateVm?: string;
  /** Agent download info */
  agentDownload?: DownloadedAgentInfo;
}

/**
 * Creates a new VM using `UTM` (via utmctl) by cloning an existing template
 */
const createUtmVm = async ({
  name,
  cpus,
  memory,
  disk,
  os,
  templateVm,
  agentDownload,
  log = createToolingLogger(),
}: CreateUtmVmOptions): Promise<HostVm> => {
  log.info(`Creating ${os} VM [${name}] using UTM`);

  // Check if utmctl is available
  try {
    await execa.command(`test -f ${UTMCTL_PATH}`);
  } catch (e) {
    throw new Error('UTM CLI (utmctl) is not installed. Install UTM from https://mac.getutm.app/');
  }

  // Check if we're in an SSH session or without GUI access
  if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT) {
    throw new Error(
      'UTM (utmctl) does not work from SSH sessions. Please run this script from a local terminal on your Mac.\n\n' +
        'Alternative: Run from Terminal.app directly on your Mac'
    );
  }

  // Try to verify UTM is accessible
  try {
    const listTest = await execa.command(`${UTMCTL_PATH} list`, { timeout: 5000 });
    if (listTest.stderr && listTest.stderr.includes('does not work from SSH')) {
      throw new Error('SSH_DETECTED');
    }
  } catch (e: unknown) {
    const error = e as Error & { stderr?: string };
    if (
      error.message === 'SSH_DETECTED' ||
      (error.stderr && error.stderr.includes('OSStatus error -1743'))
    ) {
      throw new Error(
        'UTM requires GUI access and does not work from SSH sessions or tmux/screen.\n\n' +
          'Please run this script from a local terminal (Terminal.app) on your Mac.'
      );
    }
    // Other errors (timeouts, etc) - continue, as VM might work anyway
  }

  if (!templateVm) {
    throw new Error(
      `UTM requires a template VM to clone from. Please specify --templateVm with the name of an existing UTM VM.

You can list your UTM VMs with: ${UTMCTL_PATH} list

To create a Windows template in UTM:
1. Open UTM app
2. Create a new Windows VM
3. Install Windows and QEMU guest agent
4. Use that VM name as --templateVm`
    );
  }

  // Clone the template VM
  try {
    log.info(`Cloning UTM template VM: ${templateVm} -> ${name}`);
    // Use array args instead of command string to avoid quoting issues
    await execa(UTMCTL_PATH, ['clone', templateVm, '--name', name]);
    log.verbose(`VM [${name}] cloned successfully from ${templateVm}`);
  } catch (e) {
    log.error(`Failed to clone UTM VM: ${e.message}`);
    throw new Error(
      `Failed to clone UTM VM '${templateVm}'. Make sure it exists in UTM. List VMs with: ${UTMCTL_PATH} list`
    );
  }

  if (cpus || memory || disk) {
    log.warning(
      'cpu, memory and disk options are ignored for UTM VMs. Configure these in the UTM template VM.'
    );
  }

  // Give UTM time to register the cloned VM before trying to start it
  log.info('Waiting for UTM to register the cloned VM (5 seconds)...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Start the VM
  try {
    log.info(`Starting UTM VM: ${name}`);
    const startResult = await execa(UTMCTL_PATH, ['start', name]);
    log.verbose(`Start command output:`, startResult);
    log.verbose(`VM [${name}] started successfully`);

    // Wait for VM to boot and guest agent to be ready
    log.info('Waiting for VM to boot and guest agent to be ready (30 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (e: unknown) {
    const error = e as Error & { stdout?: string; stderr?: string };
    log.error(`Failed to start UTM VM: ${error.message}`);
    if (error.stdout) {
      log.error(`stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      log.error(`stderr: ${error.stderr}`);
    }
    throw new Error(
      `Failed to start UTM VM '${name}'. The VM was cloned successfully but failed to start.\n\n` +
        `Try starting it manually in UTM app to see if there are any errors.\n` +
        `Error: ${error.message}`
    );
  }

  const vmClient = createUtmHostVmClient(name, os, log);

  // Test guest agent connectivity
  try {
    log.info('Testing QEMU Guest Agent connectivity...');
    if (os === 'windows') {
      // Test with simple Write-Output command
      const testResult = await vmClient.exec('Write-Output "Guest agent test successful"');
      log.info('Guest agent test result:', testResult.stdout);
    } else {
      await vmClient.exec('echo test');
    }
    log.verbose('Guest agent is working correctly');
  } catch (e) {
    log.error(`Guest agent test failed: ${e.message}`);
    // If the error is about guest agent, it will have helpful instructions
    // Re-throw it to stop the script early
    throw e;
  }

  // Upload agent if provided
  if (agentDownload) {
    try {
      log.info(`Uploading agent installer: ${agentDownload.filename}`);
      const destPath =
        os === 'windows'
          ? `C:\\Users\\Public\\${agentDownload.filename}`
          : `/tmp/${agentDownload.filename}`;

      await vmClient.upload(agentDownload.fullFilePath, destPath);
      log.info(`Agent uploaded to: ${destPath}`);
    } catch (e) {
      log.warning(`Failed to upload agent: ${e.message}`);
    }
  }

  return vmClient;
};

/**
 * Creates a standard client for interacting with a UTM VM
 * @param name VM name
 * @param os Operating system type
 * @param log Logger instance
 */
export const createUtmHostVmClient = (
  name: string,
  os: 'windows' | 'darwin' = 'windows',
  log: ToolingLog = createToolingLogger()
): HostVm => {
  log.debug(`Creating UTM VM client for [${name}] (OS: ${os})`);

  const exec = async (
    command: string,
    options?: { silent?: boolean }
  ): Promise<HostVmExecResponse> => {
    // Build utmctl exec command with array args
    let execArgs: string[];

    if (os === 'windows') {
      // For Windows, just run PowerShell directly
      // Keep it simple - utmctl exec doesn't capture output well, but commands still execute
      execArgs = [
        'exec',
        name,
        '--cmd',
        'powershell.exe',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        command,
      ];

      log.debug(`Executing PowerShell command: ${command}`);
    } else {
      // For Linux/macOS, pass command to sh
      execArgs = ['exec', name, '--cmd', '/bin/sh', '-c', command];
    }

    let execResponse;

    try {
      execResponse = await execa(UTMCTL_PATH, execArgs, {
        maxBuffer: MAX_BUFFER,
      });
    } catch (e: unknown) {
      const error = e as Error & { stderr?: string };
      // Check for QEMU Guest Agent not installed/running error
      if (error.stderr && error.stderr.includes('OSStatus error -2700')) {
        throw new Error(
          `QEMU Guest Agent is not installed or not running in VM '${name}'.\n\n` +
            `The guest agent is REQUIRED for UTM to execute commands and transfer files.\n\n` +
            `To fix this:\n` +
            `1. Open UTM app and start the VM '${name}'\n` +
            `2. ${
              os === 'windows'
                ? `Download QEMU Guest Agent installer:\n` +
                  `   - For Windows ARM64: https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/latest-qemu-ga/\n` +
                  `   - Look for: qemu-ga-aarch64.msi (ARM) or qemu-ga-x86_64.msi (x86)\n` +
                  `3. Run the installer in the Windows VM\n` +
                  `4. Verify service is running: Get-Service QEMU-GA`
                : `Install guest agent in the macOS VM:\n` +
                  `   brew install qemu-guest-agent\n` +
                  `3. Verify service is running: launchctl list | grep qemu`
            }\n` +
            `5. Shut down the VM\n` +
            `6. Re-run this script\n\n` +
            `See documentation: x-pack/solutions/security/plugins/security_solution/scripts/endpoint/VM_WINDOWS_MACOS_SUPPORT.md`
        );
      }

      if (!options?.silent) {
        log.error(dump(e));
      }
      throw e;
    }

    log.verbose(
      `exec response from host [${name}] for command [${command}]:\n${dump(execResponse)}`
    );

    return {
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      exitCode: execResponse.exitCode,
    };
  };

  const destroy = async (): Promise<void> => {
    // Stop the VM first
    try {
      await execa(UTMCTL_PATH, ['stop', name]);
      // Wait a bit for clean shutdown
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (e) {
      log.verbose(`VM may already be stopped: ${e.message}`);
    }

    // Delete the VM
    const destroyResponse = await execa(UTMCTL_PATH, ['delete', name]);
    log.verbose(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using UTM (${os}).
  VM Name: ${name}

  Execute command: ${chalk.cyan(`${UTMCTL_PATH} exec "${name}" --cmd <command>`)}
  Delete VM:       ${chalk.cyan(`${UTMCTL_PATH} delete "${name}"`)}
  Open in UTM:     Open UTM.app and find '${name}'
`;
  };

  const unmount = async (_: string) => {
    throw new Error('VM action `unmount` not currently supported for UTM');
  };

  const mount = async (_: string, __: string) => {
    throw new Error('VM action `mount` not currently supported for UTM');
  };

  const start = async () => {
    const response = await execa(UTMCTL_PATH, ['start', name]);
    log.verbose(`UTM start response:\n`, response);
    // Wait for guest agent
    await new Promise((resolve) => setTimeout(resolve, 20000));
  };

  const stop = async () => {
    const response = await execa(UTMCTL_PATH, ['stop', name]);
    log.verbose(`UTM stop response:\n`, response);
  };

  const upload: HostVm['upload'] = async (localFilePath, destFilePath) => {
    try {
      // UTM uses stdin for file upload - pipe the file directly to avoid corruption
      log.debug(`Uploading file via UTM: ${localFilePath} -> ${destFilePath}`);

      // Use shell to pipe cat output to utmctl
      await execa(
        'sh',
        ['-c', `cat "${localFilePath}" | ${UTMCTL_PATH} file push "${name}" "${destFilePath}"`],
        {
          // Increase buffer for large files
          maxBuffer: 500 * 1024 * 1024, // 500MB
        }
      );

      log.verbose(`Uploaded file to VM [${name}]: ${localFilePath} -> ${destFilePath}`);

      return {
        filePath: destFilePath,
        delete: async () => {
          const deleteCmd =
            os === 'windows'
              ? `Remove-Item -Path "${destFilePath}" -Force`
              : `rm "${destFilePath}"`;
          return exec(deleteCmd);
        },
      };
    } catch (e: unknown) {
      const error = e as Error & { stderr?: string };
      if (error.stderr && error.stderr.includes('OSStatus error -2700')) {
        throw new Error(
          `QEMU Guest Agent is not running in VM '${name}'. ` +
            `Guest agent is required for file operations. ` +
            `See: x-pack/solutions/security/plugins/security_solution/scripts/endpoint/VM_WINDOWS_MACOS_SUPPORT.md`
        );
      }
      throw e;
    }
  };

  const download: HostVm['download'] = async (vmFilePath: string, localFilePath: string) => {
    try {
      const localFileAbsolutePath = path.resolve(localFilePath);

      // UTM outputs to stdout - use shell to redirect
      const response = await execa('sh', [
        '-c',
        `${UTMCTL_PATH} file pull "${name}" "${vmFilePath}" > "${localFileAbsolutePath}"`,
      ]);

      log.verbose(
        `Downloaded file from VM [${name}]: ${vmFilePath} -> ${localFileAbsolutePath}`,
        response
      );

      return {
        filePath: localFileAbsolutePath,
        delete: async () => {
          return deleteFile(localFileAbsolutePath).then(() => {
            return {
              stdout: 'success',
              stderr: '',
              exitCode: 0,
            };
          });
        },
      };
    } catch (e: unknown) {
      const error = e as Error & { stderr?: string };
      if (error.stderr && error.stderr.includes('OSStatus error -2700')) {
        throw new Error(
          `QEMU Guest Agent is not running in VM '${name}'. ` +
            `Guest agent is required for file operations. ` +
            `See: x-pack/solutions/security/plugins/security_solution/scripts/endpoint/VM_WINDOWS_MACOS_SUPPORT.md`
        );
      }
      throw e;
    }
  };

  return {
    type: 'utm',
    name,
    exec,
    destroy,
    info,
    mount,
    unmount,
    transfer: upload,
    upload,
    download,
    start,
    stop,
  };
};

/**
 * Generates a unique Virtual Machine name using the current user's `username`
 * @param identifier
 * @param os Optional OS name to include in the VM name (e.g., 'windows', 'darwin', 'ubuntu')
 */
export const generateVmName = (
  identifier: string = baseGenerator.randomUser(),
  os?: string
): string => {
  const username = userInfo().username.toLowerCase().replaceAll('.', '-');
  const cleanIdentifier = identifier.toLowerCase().replace('.', '-');
  const randomSuffix = Math.random().toString().substring(2, 6);

  if (os) {
    const cleanOs = os.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${username}-${cleanIdentifier}-${cleanOs}-${randomSuffix}`;
  }

  return `${username}-${cleanIdentifier}-${randomSuffix}`;
};

/**
 * Checks if the count of VMs running under Multipass and UTM is greater than the `threshold` passed on
 * input and if so, it will return a message indicate so. Useful to remind users of the amount of
 * VMs currently running.
 * @param threshold
 */
export const getMultipassVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const listOfMultipassVMs = await findVm('multipass');
  const listOfUtmVMs = await findVm('utm');

  const totalVMs = listOfMultipassVMs.data.length + listOfUtmVMs.data.length;

  if (totalVMs > threshold) {
    const vmDetails = [];
    if (listOfMultipassVMs.data.length > 0) {
      vmDetails.push(`${listOfMultipassVMs.data.length} Multipass`);
    }
    if (listOfUtmVMs.data.length > 0) {
      vmDetails.push(`${listOfUtmVMs.data.length} UTM`);
    }

    const viewCommands = [];
    if (listOfMultipassVMs.data.length > 0) {
      viewCommands.push(chalk.cyan('multipass list'));
    }
    if (listOfUtmVMs.data.length > 0) {
      viewCommands.push(chalk.cyan('/Applications/UTM.app/Contents/MacOS/utmctl list'));
    }

    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(chalk.red(`You currently have ${chalk.red(totalVMs)} VMs running.`))}
      ${vmDetails.join(' + ')}
      Remember to delete those no longer being used.
      View running VMs: ${viewCommands.join(' or ')}
  -----------------------------------------------------------------
`;
  }

  return '';
};

interface CreateVagrantVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'vagrant';

  name: string;
  /**
   * The downloaded agent information. The Agent file will be uploaded to the Vagrant VM and
   * made available under the default login home directory (`~/agent-filename`)
   */
  agentDownload: DownloadedAgentInfo;
  /**
   * The path to the Vagrantfile to use to provision the VM. Defaults to Vagrantfile under:
   * `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/vagrant/Vagrantfile`
   */
  vagrantFile?: string;
  log?: ToolingLog;
}

/**
 * Creates a new VM using `vagrant`
 */
const createVagrantVm = async ({
  name,
  log = createToolingLogger(),
  agentDownload: { fullFilePath: agentFullFilePath, filename: agentFileName },
  vagrantFile = DEFAULT_VAGRANTFILE,
  memory,
  cpus,
  disk,
}: CreateVagrantVmOptions): Promise<HostVm> => {
  log.debug(`Using Vagrantfile: ${vagrantFile}`);

  const VAGRANT_CWD = path.dirname(vagrantFile);

  // Destroy the VM running (if any) with the provided vagrant file before re-creating it
  try {
    await execa.command(`vagrant destroy -f`, {
      env: {
        VAGRANT_CWD,
      },
      // Only `pipe` STDERR to parent process
      stdio: ['inherit', 'inherit', 'pipe'],
    });
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (memory || cpus || disk) {
    log.warning(
      `cpu, memory and disk options ignored for creation of vm via Vagrant. These should be defined in the Vagrantfile`
    );
  }

  try {
    const vagrantUpResponse = (
      await execa.command(`vagrant up`, {
        env: {
          VAGRANT_DISABLE_VBOXSYMLINKCREATE: '1',
          VAGRANT_CWD,
          VMNAME: name,
          CACHED_AGENT_SOURCE: agentFullFilePath,
          CACHED_AGENT_FILENAME: agentFileName,
          AGENT_DESTINATION_FOLDER: agentFileName.replace('.tar.gz', ''),
        },
        // Only `pipe` STDERR to parent process
        stdio: ['inherit', 'inherit', 'pipe'],
      })
    ).stdout;

    log.debug(`Vagrant up command response: `, vagrantUpResponse);
  } catch (e) {
    log.error(e);
    throw e;
  }

  return createVagrantHostVmClient(name, undefined, log);
};

/**
 * Creates a generic interface (`HotVm`) for interacting with a VM created by Vagrant
 * @param name
 * @param log
 * @param vagrantFile
 */
export const createVagrantHostVmClient = (
  name: string,
  vagrantFile: string = DEFAULT_VAGRANTFILE,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  const VAGRANT_CWD = path.dirname(vagrantFile);
  const execaOptions: execa.Options = {
    env: {
      VAGRANT_CWD,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: MAX_BUFFER,
  };

  log.debug(`Creating Vagrant VM client for [${name}] with vagrantfile [${vagrantFile}]`);

  const exec = async (
    command: string,
    options?: { silent?: boolean }
  ): Promise<HostVmExecResponse> => {
    const execResponse = await execa
      .command(`vagrant ssh -- ${command}`, execaOptions)
      .catch((e) => {
        if (!options?.silent) {
          log.error(dump(e));
        }
        throw e;
      });

    log.verbose(execResponse);

    return {
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      exitCode: execResponse.exitCode,
    };
  };

  const destroy = async (): Promise<void> => {
    const destroyResponse = await execa.command(`vagrant destroy -f`, execaOptions);

    log.debug(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using Vagrant.
  VM Name: ${name}

  Shell access: ${chalk.cyan(`vagrant ssh ${name}`)}
  Delete VM:    ${chalk.cyan(`vagrant destroy ${name} -f`)}
`;
  };

  const unmount = async (_: string) => {
    throw new Error('VM action `unmount`` not currently supported for vagrant');
  };

  const mount = async (_: string, __: string) => {
    throw new Error('VM action `mount` not currently supported for vagrant');
  };

  const start = async () => {
    const response = await execa.command(`vagrant up`, execaOptions);
    log.verbose('vagrant up response:\n', response);
  };

  const stop = async () => {
    const response = await execa.command(`vagrant suspend`, execaOptions);
    log.verbose('vagrant suspend response:\n', response);
  };

  const upload: HostVm['upload'] = async (localFilePath, destFilePath) => {
    const response = await execa.command(
      `vagrant upload ${localFilePath} ${destFilePath}`,
      execaOptions
    );
    log.verbose(`Uploaded file to VM [${name}]:`, response);

    return {
      filePath: destFilePath,
      delete: async () => {
        return exec(`rm ${destFilePath}`);
      },
    };
  };

  const download: HostVm['download'] = async (vmFilePath, localFilePath) => {
    const localFileAbsolutePath = path.resolve(localFilePath);

    // Vagrant will auto-mount the directory that includes the Vagrant file to the VM under `/vagrant`,
    // and it keeps that sync'd to the local system. So we first copy the file in the VM there so we
    // can retrieve it from the local machine
    await exec(`cp ${vmFilePath} /vagrant`).catch((e) => {
      log.error(`Error while attempting to copy file on VM:\n${dump(e)}`);
      throw e;
    });

    // Now move the file from the local vagrant directory to the desired location
    await execa.command(`mv ${VAGRANT_CWD}/${path.basename(vmFilePath)} ${localFileAbsolutePath}`);

    return {
      filePath: localFileAbsolutePath,
      delete: async () => {
        return deleteFile(localFileAbsolutePath).then(() => {
          return {
            stdout: 'success',
            stderr: '',
            exitCode: 0,
          };
        });
      },
    };
  };

  return {
    type: 'vagrant',
    name,
    exec,
    destroy,
    info,
    mount,
    unmount,
    transfer: upload,
    upload,
    download,
    start,
    stop,
  };
};

/**
 * create and return a Host VM client client
 * @param hostname
 * @param type
 * @param vagrantFile
 * @param log
 */
export const getHostVmClient = (
  hostname: string,
  type: SupportedVmManager = process.env.CI ? 'vagrant' : 'multipass',
  /** Will only be used if `type` is `vagrant` */
  vagrantFile?: string,
  log: ToolingLog = createToolingLogger(),
  /** OS type for UTM VMs */
  os: 'windows' | 'darwin' = 'windows'
): HostVm => {
  switch (type) {
    case 'multipass':
      return createMultipassHostVmClient(hostname, log);
    case 'vagrant':
      return createVagrantHostVmClient(hostname, vagrantFile || DEFAULT_VAGRANTFILE, log);
    case 'utm':
      return createUtmHostVmClient(hostname, os, log);
    default:
      throw new Error(`Unsupported VM manager type: ${type}`);
  }
};

/**
 * Retrieve a list of running VM names
 * @param type
 * @param name
 * @param log
 */
export const findVm = async (
  type: SupportedVmManager,
  /** Filter results by VM name */
  name?: string | RegExp,
  log: ToolingLog = createToolingLogger()
): Promise<{ data: string[] }> => {
  log.verbose(`Finding [${type}] VMs with name [${name}]`);

  if (type === 'multipass') {
    const list = JSON.parse((await execa.command(`multipass list --format json`)).stdout) as {
      list: Array<{
        ipv4: string[];
        name: string;
        release: string;
        state: string;
      }>;
    };

    log.verbose(`List of VM running:`, list);

    if (!list.list || list.list.length === 0) {
      return { data: [] };
    }

    return {
      data: !name
        ? list.list.map((vmEntry) => vmEntry.name)
        : list.list.reduce((acc, vmEntry) => {
            if (typeof name === 'string') {
              if (vmEntry.name === name) {
                acc.push(vmEntry.name);
              }
            } else {
              if (name.test(vmEntry.name)) {
                acc.push(vmEntry.name);
              }
            }

            return acc;
          }, [] as string[]),
    };
  }

  if (type === 'utm') {
    try {
      // Check if running in SSH or without GUI access
      if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT) {
        log.warning('UTM does not work from SSH sessions. Returning empty VM list.');
        return { data: [] };
      }

      const listOutput = await execa.command(`${UTMCTL_PATH} list`);

      // Parse the output - format is:
      // UUID                                 Status   Name
      // <uuid>                               <status> <name>
      const lines = listOutput.stdout.split('\n').slice(1); // Skip header
      const vmNames: string[] = [];

      for (const line of lines) {
        if (line.trim()) {
          // Split by whitespace and get the last part (name)
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const vmName = parts.slice(2).join(' '); // In case name has spaces
            vmNames.push(vmName);
          }
        }
      }

      log.verbose(`List of UTM VMs:`, vmNames);

      if (vmNames.length === 0) {
        return { data: [] };
      }

      // Filter by name if provided
      return {
        data: !name
          ? vmNames
          : vmNames.filter((vmName) => {
              if (typeof name === 'string') {
                return vmName === name;
              } else {
                return name.test(vmName);
              }
            }),
      };
    } catch (e: unknown) {
      const error = e as Error & { stderr?: string };
      if (error.stderr && error.stderr.includes('OSStatus error -1743')) {
        log.warning('UTM requires GUI access. Returning empty VM list.');
        return { data: [] };
      }
      log.error(`Error listing UTM VMs: ${error.message}`);
      return { data: [] };
    }
  }

  if (type === 'vagrant') {
    try {
      const listOutput = await execa.command('vagrant global-status --prune');

      // Parse vagrant output - format:
      // id       name    provider   state    directory
      // <id>     <name>  <provider> <state>  <path>
      const lines = listOutput.stdout.split('\n');
      const vmNames: string[] = [];

      let inDataSection = false;
      for (const line of lines) {
        if (line.includes('----')) {
          inDataSection = true;
        } else if (line.includes('The above shows information about all known Vagrant')) {
          break;
        } else if (inDataSection && line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const vmName = parts[1]; // Second column is name
            vmNames.push(vmName);
          }
        }
      }

      log.verbose(`List of Vagrant VMs:`, vmNames);

      return {
        data: !name
          ? vmNames
          : vmNames.filter((vmName) => {
              if (typeof name === 'string') {
                return vmName === name;
              } else {
                return name.test(vmName);
              }
            }),
      };
    } catch (e: unknown) {
      const error = e as Error;
      log.error(`Error listing Vagrant VMs: ${error.message}`);
      return { data: [] };
    }
  }

  throw new Error(`findVm() does not yet have support for [${type}]`);
};
