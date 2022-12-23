export const endpointPolicyConfig = {
  value: {
    linux: {
      behavior_protection: {
        mode: 'off',
        supported: true,
      },
      popup: {
        behavior_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
        malware: {
          message: 'Elastic Security {action} {filename}',
          enabled: false,
        },
        memory_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
      },
      malware: {
        mode: 'off',
        blocklist: false,
      },
      logging: {
        file: 'info',
      },
      events: {
        tty_io: false,
        process: true,
        session_data: false,
        file: true,
        network: true,
      },
      memory_protection: {
        mode: 'off',
        supported: true,
      },
    },
    windows: {
      behavior_protection: {
        mode: 'off',
        supported: true,
      },
      popup: {
        behavior_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
        malware: {
          message: 'Elastic Security {action} {filename}',
          enabled: false,
        },
        ransomware: {
          message: 'Elastic Security {action} {filename}',
          enabled: false,
        },
        memory_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
      },
      malware: {
        mode: 'off',
        blocklist: false,
      },
      attack_surface_reduction: {
        credential_hardening: {
          enabled: false,
        },
      },
      logging: {
        file: 'info',
      },
      antivirus_registration: {
        enabled: false,
      },
      events: {
        registry: true,
        process: true,
        security: true,
        file: true,
        dns: true,
        dll_and_driver_load: true,
        network: true,
      },
      ransomware: {
        mode: 'off',
        supported: true,
      },
      memory_protection: {
        mode: 'off',
        supported: true,
      },
    },
    mac: {
      behavior_protection: {
        mode: 'off',
        supported: true,
      },
      popup: {
        behavior_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
        malware: {
          message: 'Elastic Security {action} {filename}',
          enabled: false,
        },
        memory_protection: {
          message: 'Elastic Security {action} {rule}',
          enabled: false,
        },
      },
      malware: {
        mode: 'off',
        blocklist: false,
      },
      logging: {
        file: 'info',
      },
      events: {
        process: true,
        file: true,
        network: true,
      },
      memory_protection: {
        mode: 'off',
        supported: true,
      },
    },
  },
}
