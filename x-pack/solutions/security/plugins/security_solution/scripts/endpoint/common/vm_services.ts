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

type CreateVmOptions = CreateMultipassVmOptions | CreateVagrantVmOptions | CreateOrbstackVmOptions;

/**
 * Creates a new VM
 */
export const createVm = async (options: CreateVmOptions): Promise<HostVm> => {
  if (options.type === 'multipass') {
    return createMultipassVm(options);
  }

  if (options.type === 'orbstack') {
    return createOrbstackVm(options);
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

interface CreateOrbstackVmOptions extends BaseVmCreateOptions {
  type: SupportedVmManager & 'orbstack';
  name: string;
  log?: ToolingLog;
  /** Linux distribution to use for the VM. Defaults to 'ubuntu' */
  distro?: string;
}

/**
 * Creates a new VM using OrbStack
 */
const createOrbstackVm = async ({
  name,
  disk,
  cpus,
  memory,
  distro = 'ubuntu',
  log = createToolingLogger(),
}: CreateOrbstackVmOptions): Promise<HostVm> => {
  log.info(`Creating VM [${name}] using OrbStack`);

  if (disk || cpus || memory) {
    log.warning(
      `cpu, memory, and disk options are managed by OrbStack automatically and will be ignored`
    );
  }

  const createResponse = await execa.command(`orb create ${distro} ${name}`);

  log.verbose(`VM [${name}] created successfully using OrbStack.`, createResponse);

  return createOrbstackHostVmClient(name, log);
};

/**
 * Creates a standard client for interacting with an OrbStack VM
 * @param name
 * @param log
 */
export const createOrbstackHostVmClient = (
  name: string,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  const exec = async (
    command: string,
    options?: { silent?: boolean }
  ): Promise<HostVmExecResponse> => {
    // OrbStack's orb run: use -u to run as default user and cd to home directory first
    // This ensures we're in the same directory where files are uploaded (home dir)
    const fullCommand = `cd ~ && ${command}`;
    const execResponse = await execa('orb', ['run', '-m', name, 'bash', '-c', fullCommand], {
      maxBuffer: MAX_BUFFER,
    }).catch((e) => {
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
    const destroyResponse = await execa.command(`orb delete ${name}`);
    log.verbose(`VM [${name}] was destroyed successfully`, destroyResponse);
  };

  const info = () => {
    return `VM created using OrbStack.
  VM Name: ${name}

  Shell access: ${chalk.cyan(`orb shell -m ${name}`)}
  Delete VM:    ${chalk.cyan(`orb delete ${name}`)}
`;
  };

  const unmount = async (_hostVmDir: string) => {
    // OrbStack provides automatic filesystem integration via /Volumes/OrbStack
    // No explicit unmount needed as it's managed by OrbStack
    log.verbose(`OrbStack handles filesystem integration automatically, no explicit unmount needed`);
  };

  const mount = async (localDir: string, hostVmDir: string) => {
    // OrbStack automatically mounts the macOS filesystem to the VM
    // The local directory is accessible from the VM via the OrbStack filesystem integration
    log.verbose(
      `OrbStack provides automatic filesystem access. Local dir [${localDir}] accessible in VM`
    );

    return {
      hostDir: hostVmDir,
      unmount: () => unmount(hostVmDir),
    };
  };

  const start = async () => {
    const response = await execa.command(`orb start ${name}`);
    log.verbose(`OrbStack start response:\n`, response);
  };

  const stop = async () => {
    const response = await execa.command(`orb stop ${name}`);
    log.verbose(`OrbStack stop response:\n`, response);
  };

  const upload: HostVm['upload'] = async (localFilePath, destFilePath) => {
    const response = await execa.command(`orb push -m ${name} ${localFilePath} ${destFilePath}`);
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
      `orb pull -m ${name} ${vmFilePath} ${localFileAbsolutePath}`
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
    type: 'orbstack',
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
 * Checks if the count of VM running under OrbStack is greater than the `threshold` passed on
 * input and if so, it will return a message indicate so. Useful to remind users of the amount of
 * VM currently running.
 * @param threshold
 */
export const getOrbstackVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const listOfVMs = await findVm('orbstack');

  if (listOfVMs.data.length > threshold) {
    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      chalk.red(`You currently have ${chalk.red(listOfVMs.data.length)} OrbStack VMs running.`)
    )}
      Remember to delete those no longer being used.
      View running VMs: ${chalk.cyan('orb list')}
  -----------------------------------------------------------------
`;
  }

  return '';
};

/**
 * Generates a unique Virtual Machine name using the current user's `username`
 * @param identifier
 */
export const generateVmName = (identifier: string = baseGenerator.randomUser()): string => {
  return `${userInfo().username.toLowerCase().replaceAll('.', '-')}-${identifier
    .toLowerCase()
    .replace('.', '-')}-${Math.random().toString().substring(2, 6)}`;
};

/**
 * Checks if the count of VM running under Multipass is greater than the `threshold` passed on
 * input and if so, it will return a message indicate so. Useful to remind users of the amount of
 * VM currently running.
 * @param threshold
 */
export const getMultipassVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const listOfVMs = await findVm('multipass');

  if (listOfVMs.data.length > threshold) {
    return `-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      chalk.red(`You currently have ${chalk.red(listOfVMs.data.length)} VMs running.`)
    )}
      Remember to delete those no longer being used.
      View running VMs: ${chalk.cyan('multipass list')}
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
  vagrantFile: string = DEFAULT_VAGRANTFILE,
  log: ToolingLog = createToolingLogger()
): HostVm => {
  if (type === 'vagrant') {
    return createVagrantHostVmClient(hostname, vagrantFile, log);
  }

  if (type === 'orbstack') {
    return createOrbstackHostVmClient(hostname, log);
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

  if (type === 'orbstack') {
    // OrbStack's `orb list` command outputs machines in a format like:
    // NAME        STATE
    // my-vm       running
    const listOutput = (await execa.command(`orb list`)).stdout;
    const lines = listOutput.split('\n').filter((line) => line.trim());

    log.verbose(`OrbStack list output:`, listOutput);

    // Skip header line and parse VM names
    const vmNames: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 1 && parts[0]) {
        vmNames.push(parts[0]);
      }
    }

    if (vmNames.length === 0) {
      return { data: [] };
    }

    return {
      data: !name
        ? vmNames
        : vmNames.filter((vmName) => {
            if (typeof name === 'string') {
              return vmName === name;
            }
            return name.test(vmName);
          }),
    };
  }

  throw new Error(`findVm() does not yet have support for [${type}]`);
};
