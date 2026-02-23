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
import pRetry from 'p-retry';
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

type CreateVmOptions =
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
  /**
   * When true, attempt to attach a bridged network interface to the VM so it can
   * reach services on the LAN (e.g. Caldera running outside the host NAT).
   * Defaults to true for local demo/dev usage (can be disabled via env).
   */
  bridged?: boolean;
  /** Optional override for the host network device to bridge (e.g. `en0`). */
  bridgedNetwork?: string;
}

const getDefaultMultipassBridgedNetwork = async (): Promise<string | undefined> => {
  try {
    const raw = (await execa('multipass', ['networks', '--format', 'json'])).stdout;
    const parsed = JSON.parse(raw) as {
      list?: Array<{ name: string; type: string; description?: string }>;
    };
    const list = parsed.list ?? [];

    // Prefer common primary interfaces first
    const preferred = ['en0', 'eth0', 'wlan0'];
    const byName = (n: string) => list.find((x) => x.name === n)?.name;
    for (const n of preferred) {
      const found = byName(n);
      if (found) return found;
    }

    return list[0]?.name;
  } catch {
    return undefined;
  }
};

const createMultipassVm = async ({
  name,
  disk = '15G',
  cpus = 2,
  memory = '2G',
  // Always use the latest Ubuntu LTS image for demo/dev VMs by default.
  // Multipass resolves `lts` to the current latest Ubuntu LTS.
  // If you want to pin a specific image, set `image` explicitly.
  image = 'lts',
  bridged = process.env.KBN_MULTIPASS_BRIDGED !== '0',
  bridgedNetwork = process.env.KBN_MULTIPASS_BRIDGED_NETWORK,
  log = createToolingLogger(),
}: CreateMultipassVmOptions): Promise<HostVm> => {
  log.info(`Creating VM [${name}] using multipass`);

  const baseArgs = ['launch', '--name', name, '--disk', disk, '--cpus', String(cpus), '--memory', memory];
  const imageArgs = image ? [image] : [];

  const tryLaunch = async (useBridged: boolean) => {
    const bridgedArgs: string[] = [];
    if (useBridged) {
      const chosen =
        bridgedNetwork || (await getDefaultMultipassBridgedNetwork());
      if (chosen) {
        // Ensure `--bridged` uses a real interface on this host.
        // If this fails (permissions/unsupported), we still fall back to non-bridged launch.
        try {
          await execa('multipass', ['set', `local.bridged-network=${chosen}`]);
          bridgedArgs.push('--bridged');
          log.info(`Using bridged networking for VM [${name}] via host interface [${chosen}]`);
        } catch (e) {
          log.warning(
            `Unable to enable bridged networking via interface [${chosen}]. Falling back to NAT.`
          );
          log.verbose(dump(e));
        }
      } else {
        log.warning(`No Multipass networks available for bridging. Falling back to NAT.`);
      }
    }

    return execa('multipass', [...baseArgs, ...bridgedArgs, ...imageArgs]);
  };

  const createResponse = await tryLaunch(bridged).catch(async (e) => {
    if (!bridged) throw e;
    log.warning(
      `Multipass launch with bridged networking failed for VM [${name}]. Retrying without bridged networking...`
    );
    log.verbose(dump(e));
    return tryLaunch(false);
  });

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
  const splitArgs = (command: string): string[] => {
    // Minimal shell-like argument splitting for "no-shell" exec mode.
    // Supports single/double quotes and backslash escaping.
    const args: string[] = [];
    let current = '';
    let quote: '"' | "'" | null = null;
    let escapeNext = false;

    for (const ch of command) {
      if (escapeNext) {
        current += ch;
        escapeNext = false;
        continue;
      }

      if (ch === '\\') {
        escapeNext = true;
        continue;
      }

      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        if (current.length) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += ch;
    }

    if (current.length) {
      args.push(current);
    }

    return args;
  };

  const exec = async (
    command: string,
    options?: { silent?: boolean; shell?: boolean }
  ): Promise<HostVmExecResponse> => {
    const execMultipass = async () => {
      const useShell = options?.shell ?? true; // default to previous behavior for backwards compatibility

      // IMPORTANT:
      // - Use argv form (not a single host-shell string) to avoid host-shell quoting issues
      // - When `shell` is enabled, run via `bash -lc` inside the VM so pipelines/redirections/&& work
      if (useShell) {
        return execa('multipass', ['exec', name, '--', 'bash', '-lc', command], {
          maxBuffer: MAX_BUFFER,
        });
      }

      const argv = splitArgs(command);
      if (argv.length === 0) {
        return execa('multipass', ['exec', name, '--', 'true'], { maxBuffer: MAX_BUFFER });
      }

      return execa('multipass', ['exec', name, '--', ...argv], { maxBuffer: MAX_BUFFER });
    };

    const isRetryableMultipassSshError = (e: unknown): boolean => {
      const err = e as { stderr?: string; shortMessage?: string; message?: string };
      const msg = `${err.stderr ?? ''}\n${err.shortMessage ?? ''}\n${err.message ?? ''}`;

      // Multipass sometimes reports transient SSH reachability errors right after instance creation.
      return /ssh connection failed|no route to host|connection refused|timed out|i\/o timeout/i.test(
        msg
      );
    };

    const execResponse = await pRetry(
      async () => {
        try {
          return await execMultipass();
        } catch (e) {
          if (!isRetryableMultipassSshError(e)) {
            throw new pRetry.AbortError(e);
          }
          throw e;
        }
      },
      {
        retries: 12,
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (e) => {
          if (!options?.silent) {
            log.warning(
              `Multipass exec failed for VM [${name}] (attempt #${e.attemptNumber}, ${e.retriesLeft} retries left). Retrying...`
            );
            log.verbose(dump(e));
          }
        },
      }
    ).catch((e) => {
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
//
// NOTE: UTM is macOS-only and requires GUI access. `utmctl` uses the QEMU guest agent to execute
// commands and transfer files to/from the VM.
const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';

interface CreateUtmVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'utm';
  name: string;
  log?: ToolingLog;
  /** OS type for the VM */
  os: 'windows' | 'darwin' | 'linux';
  /** UTM VM name to clone from (must exist in UTM) */
  templateVm?: string;
  /** Agent download info (optional) to upload into the VM after start */
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
  } catch {
    throw new Error(
      'UTM CLI (utmctl) is not installed. Install UTM from https://mac.getutm.app/ and retry.'
    );
  }

  // UTM requires GUI access and does not work reliably from SSH sessions
  if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT) {
    throw new Error(
      'UTM (utmctl) does not work from SSH sessions. Please run this script from a local terminal on your Mac.'
    );
  }

  if (!templateVm) {
    throw new Error(
      `UTM requires a template VM to clone from. Please specify --templateVm with the name of an existing UTM VM.\n\n` +
        `You can list your UTM VMs with: ${UTMCTL_PATH} list`
    );
  }

  // Clone the template VM
  try {
    log.info(`Cloning UTM template VM: ${templateVm} -> ${name}`);
    await execa(UTMCTL_PATH, ['clone', templateVm, '--name', name]);
    log.verbose(`VM [${name}] cloned successfully from ${templateVm}`);
  } catch (e: unknown) {
    const error = e as Error;
    log.error(`Failed to clone UTM VM: ${error.message}`);
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
    await execa(UTMCTL_PATH, ['start', name]);
    log.verbose(`VM [${name}] started successfully`);

    // Wait for VM to boot and guest agent to be ready
    log.info('Waiting for VM to boot and guest agent to be ready (30 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (e: unknown) {
    const error = e as Error & { stdout?: string; stderr?: string };
    log.error(`Failed to start UTM VM: ${error.message}`);
    if (error.stdout) log.error(`stdout: ${error.stdout}`);
    if (error.stderr) log.error(`stderr: ${error.stderr}`);
    throw new Error(
      `Failed to start UTM VM '${name}'. The VM was cloned successfully but failed to start.\n` +
        `Try starting it manually in UTM.app to see if there are any errors.\n` +
        `Error: ${error.message}`
    );
  }

  const vmClient = createUtmHostVmClient(name, os, log);

  // Test guest agent connectivity
  log.info('Testing QEMU Guest Agent connectivity...');
  try {
    if (os === 'windows') {
      const testResult = await vmClient.exec('Write-Output "Guest agent test successful"');
      log.verbose(`Guest agent test output: ${testResult.stdout}`);
    } else {
      await vmClient.exec('echo test');
    }
  } catch (e) {
    log.error(`Guest agent test failed: ${(e as Error).message}`);
    throw e;
  }

  // Upload agent if provided
  if (agentDownload) {
    try {
      log.info(`Uploading agent installer: ${agentDownload.filename}`);
      const destPath =
        os === 'windows'
          ? `C:\\\\Users\\\\Public\\\\${agentDownload.filename}`
          : `/tmp/${agentDownload.filename}`;
      await vmClient.upload(agentDownload.fullFilePath, destPath);
      log.info(`Agent uploaded to: ${destPath}`);
    } catch (e: unknown) {
      log.warning(`Failed to upload agent: ${(e as Error).message}`);
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
  os: 'windows' | 'darwin' | 'linux' = 'windows',
  log: ToolingLog = createToolingLogger()
): HostVm => {
  log.debug(`Creating UTM VM client for [${name}] (OS: ${os})`);

  const exec = async (
    command: string,
    options?: { silent?: boolean }
  ): Promise<HostVmExecResponse> => {
    const execArgs: string[] =
      os === 'windows'
        ? [
            'exec',
            name,
            '--cmd',
            'powershell.exe',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            command,
          ]
        : ['exec', name, '--cmd', '/bin/sh', '-c', command];

    try {
      const execResponse = await execa(UTMCTL_PATH, execArgs, { maxBuffer: MAX_BUFFER });
      log.verbose(
        `exec response from host [${name}] for command [${command}]:\n${dump(execResponse)}`
      );
      return {
        stdout: execResponse.stdout,
        stderr: execResponse.stderr,
        exitCode: execResponse.exitCode,
      };
    } catch (e: unknown) {
      const error = e as Error & { stderr?: string };
      // QEMU Guest Agent not installed/running
      if (error.stderr && error.stderr.includes('OSStatus error -2700')) {
        throw new Error(
          `QEMU Guest Agent is not installed or not running in VM '${name}'. ` +
            `The guest agent is required for UTM exec/file operations.`
        );
      }

      if (!options?.silent) {
        log.error(dump(e));
      }
      throw e;
    }
  };

  const destroy = async (): Promise<void> => {
    try {
      await execa(UTMCTL_PATH, ['stop', name]);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (e: unknown) {
      log.verbose(`VM may already be stopped: ${(e as Error).message}`);
    }

    const destroyResponse = await execa(UTMCTL_PATH, ['delete', name]);
    log.verbose(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using UTM (${os}).
  VM Name: ${name}

  Execute command: ${chalk.cyan(`${UTMCTL_PATH} exec \"${name}\" --cmd <command>`)}
  Delete VM:       ${chalk.cyan(`${UTMCTL_PATH} delete \"${name}\"`)}
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
    await new Promise((resolve) => setTimeout(resolve, 20000));
  };

  const stop = async () => {
    const response = await execa(UTMCTL_PATH, ['stop', name]);
    log.verbose(`UTM stop response:\n`, response);
  };

  const upload: HostVm['upload'] = async (localFilePath, destFilePath) => {
    // UTM `file push` reads file content from stdin
    await execa(
      'sh',
      ['-c', `cat "${localFilePath}" | ${UTMCTL_PATH} file push "${name}" "${destFilePath}"`],
      { maxBuffer: 500 * 1024 * 1024 }
    );

    log.verbose(`Uploaded file to VM [${name}]: ${localFilePath} -> ${destFilePath}`);

    return {
      filePath: destFilePath,
      delete: async () => {
        const deleteCmd =
          os === 'windows' ? `Remove-Item -Path "${destFilePath}" -Force` : `rm "${destFilePath}"`;
        return exec(deleteCmd);
      },
    };
  };

  const download: HostVm['download'] = async (vmFilePath: string, localFilePath: string) => {
    const localFileAbsolutePath = path.resolve(localFilePath);
    await execa('sh', [
      '-c',
      `${UTMCTL_PATH} file pull "${name}" "${vmFilePath}" > "${localFileAbsolutePath}"`,
    ]);

    log.verbose(`Downloaded file from VM [${name}]: ${vmFilePath} -> ${localFileAbsolutePath}`);

    return {
      filePath: localFileAbsolutePath,
      delete: async () => {
        return deleteFile(localFileAbsolutePath).then(() => {
          return { stdout: 'success', stderr: '', exitCode: 0 };
        });
      },
    };
  };

  return {
    type: 'utm',
    platform: os,
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
 * VM currently running.
 * @param threshold
 */
export const getMultipassVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const listOfMultipassVMs = await findVm('multipass');
  const listOfUtmVMs = await findVm('utm');

  const totalVMs = listOfMultipassVMs.data.length + listOfUtmVMs.data.length;

  if (totalVMs > threshold) {
    const vmDetails: string[] = [];
    if (listOfMultipassVMs.data.length > 0) vmDetails.push(`${listOfMultipassVMs.data.length} Multipass`);
    if (listOfUtmVMs.data.length > 0) vmDetails.push(`${listOfUtmVMs.data.length} UTM`);

    const viewCommands: string[] = [];
    if (listOfMultipassVMs.data.length > 0) viewCommands.push(chalk.cyan('multipass list'));
    if (listOfUtmVMs.data.length > 0) viewCommands.push(chalk.cyan(`${UTMCTL_PATH} list`));

    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      chalk.red(`You currently have ${chalk.red(totalVMs)} VMs running (${vmDetails.join(', ')}).`)
    )}
      Remember to delete those no longer being used.
      View running VMs: ${viewCommands.join('  |  ')}
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
  } catch (e) { }

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
    options?: { silent?: boolean; shell?: boolean }
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
  vagrantFile: string = DEFAULT_VAGRANTFILE,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  if (type === 'vagrant') {
    return createVagrantHostVmClient(hostname, vagrantFile, log);
  }

  if (type === 'utm') {
    // Default to windows if caller does not provide OS context. Prefer `createUtmHostVmClient(...)`
    // when you need to specify linux/darwin.
    return createUtmHostVmClient(hostname, 'windows', log);
  }

  return createMultipassHostVmClient(hostname, log);
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
    // utmctl list output format (typical):
    // UUID  NAME  STATUS
    // <uuid> <name...> <status>
    const raw = (await execa(UTMCTL_PATH, ['list'])).stdout;
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const data = lines
      .filter((line) => !/^uuid\s+/i.test(line))
      .map((line) => {
        const parts = line.split(/\s+/);
        if (parts.length < 2) return '';
        // name can contain spaces; drop first token (uuid) and last token (status) if present
        const tokens = parts.slice(1);
        const maybeStatus = tokens[tokens.length - 1];
        const statusLooksLike = /^(running|stopped|paused|suspended)$/i.test(maybeStatus);
        const nameTokens = statusLooksLike ? tokens.slice(0, -1) : tokens;
        return nameTokens.join(' ');
      })
      .filter(Boolean)
      .filter((vmName) => {
        if (!name) return true;
        if (typeof name === 'string') return vmName === name;
        return name.test(vmName);
      });

    return { data };
  }

  throw new Error(`findVm() does not yet have support for [${type}]`);
};
