export const PRIVMON_ALL_DATA_FEED= 
[
  {
    "id": "datafeed-pad_windows_high_count_special_logon_events",
    "job_id": "pad_windows_high_count_special_logon_events",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_high_count_special_logon_events",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "terms": {
                "event.action": [
                  "logged-in-special",
                  "logged-in-explicit"
                ]
              }
            },
            {
              "terms": {
                "event.code": [
                  "4672",
                  "4648"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_high_count_special_privilege_use_events",
    "job_id": "pad_windows_high_count_special_privilege_use_events",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_high_count_special_privilege_use_events",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "terms": {
                "event.action": [
                  "privileged-operation",
                  "privileged-service-called"
                ]
              }
            },
            {
              "terms": {
                "event.code": [
                  "4673",
                  "4674"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_high_count_group_management_events",
    "job_id": "pad_windows_high_count_group_management_events",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_high_count_group_management_events",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "terms": {
                "event.action": [
                  "added-member-to-group",
                  "removed-member-from-group"
                ]
              }
            },
            {
              "terms": {
                "event.code": [
                  "4732",
                  "4728",
                  "4756",
                  "4733",
                  "4729"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_high_count_user_account_management_events",
    "job_id": "pad_windows_high_count_user_account_management_events",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_high_count_user_account_management_events",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "terms": {
                "event.action": [
                  "enabled-user-account",
                  "added-user-account",
                  "deleted-user-account",
                  "disabled-user-account"
                ]
              }
            },
            {
              "terms": {
                "event.code": [
                  "4722",
                  "4720",
                  "4726",
                  "4725"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
          }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_rare_privilege_assigned_to_user",
    "job_id": "pad_windows_rare_privilege_assigned_to_user",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_rare_privilege_assigned_to_user",
      "query": {
        "bool": {
          "filter": [
            {
              "exists": {
                "field": "privilege_type"
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_rare_group_name_by_user",
    "job_id": "pad_windows_rare_group_name_by_user",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_rare_group_name_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "terms": {
                "event.action": [
                  "added-member-to-group",
                  "removed-member-from-group"
                ]
              }
            },
            {
              "terms": {
                "event.code": [
                  "4732",
                  "4728",
                  "4756",
                  "4733",
                  "4729"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_rare_device_by_user",
    "job_id": "pad_windows_rare_device_by_user",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_rare_device_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "exists": {
                "field": "host.name"
              }
            },
            {
              "exists": {
                "field": "user.name"
              }
            },
            {
              "terms": {
                "event.code": [
                  "4720",
                  "4726",
                  "4722",
                  "4756",
                  "4672",
                  "4673",
                  "4674",
                  "4720",
                  "4728",
                  "4732",
                  "4756",
                  "624",
                  "632",
                  "636",
                  "660",
                  "4725",
                  "4723",
                  "4648",
                  "4688",
                  "4729",
                  "4733",
                  "4757",
                  "637",
                  "661"
                ]
              }
            }
          ],
        "must_not": [
          {
            "terms": {
              "event.action": [
                "log_on",
                "created_process"
              ]
              }
            },
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_rare_source_ip_by_user",
    "job_id": "pad_windows_rare_source_ip_by_user",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_rare_source_ip_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "exists": {
                "field": "source.ip"
              }
            },
            {
              "exists": {
                "field": "user.name"
              }
            },
            {
              "terms": {
                "event.code": [
                  "4720",
                  "4726",
                  "4722",
                  "4756",
                  "4672",
                  "4673",
                  "4674",
                  "4720",
                  "4728",
                  "4732",
                  "4756",
                  "624",
                  "632",
                  "636",
                  "660",
                  "4725",
                  "4723",
                  "4648",
                  "4688",
                  "4729",
                  "4733",
                  "4757",
                  "637",
                  "661"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "event.action": [
                "log_on",
                "created_process"
              ]
              }
            },
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_windows_rare_region_name_by_user",
    "job_id": "pad_windows_rare_region_name_by_user",
    "config": {
      "indices": [
        "logs-windows-*"
      ],
      "job_id": "pad_windows_rare_region_name_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "terms": {
                "host.os.type": [
                  "windows",
                  "Windows"
                ]
              }
            },
            {
              "exists": {
                "field": "source.geo.region_name"
              }
            },
            {
              "exists": {
                "field": "user.name"
              }
            },
            {
              "terms": {
                "event.code": [
                  "4720",
                  "4726",
                  "4722",
                  "4756",
                  "4672",
                  "4673",
                  "4674",
                  "4720",
                  "4728",
                  "4732",
                  "4756",
                  "624",
                  "632",
                  "636",
                  "660",
                  "4725",
                  "4723",
                  "4648",
                  "4688",
                  "4729",
                  "4733",
                  "4757",
                  "637",
                  "661"
                ]
              }
            }
          ],
          "must_not": [
          {
            "terms": {
              "event.action": [
                "log_on",
                "created_process"
              ]
              }
            },
          {
            "terms": {
              "process.name":
              [ "elastic-agent.exe",
              "elastic-agent",
              "metricbeat.exe",
              "metricbeat",
              "filebeat.exe",
              "filebeat",
              "packetbeat.exe",
              "packetbeat",
              "winlogbeat.exe",
              "winlogbeat" ]
            }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_linux_high_count_privileged_process_events_by_user",
    "job_id": "pad_linux_high_count_privileged_process_events_by_user",
    "config": {
      "indices": [
        "logs-linux-*"
      ],
      "job_id": "pad_linux_high_count_privileged_process_events_by_user",
      "query": {
          "bool": {
            "must": [
              {
                "terms": {
                  "host.os.type": [
                    "linux",
                    "Linux"
                  ]
                }
              },
              {
                "term": {
                  "event.category": "process"
                }
              },
              {
                "terms": {
                  "event.type": [
                    "start",
                    "change"
                  ]
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "process.command_line.text": "LD_PRELOAD"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/etc/ld.so.preload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/root/.ssh/authorized_keys"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "timestamp_timeout=-1"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "!tty_tickets"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "var/spool/cron"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl daemon-reload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw mod user"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw unlock"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "chmod u+s"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo setcap cap_setuid"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "su nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo */root/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*etc/sudoers"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*visudo"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "etc/cron.*/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "trap*SIGINT"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*2000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*4000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl start*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl enable*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bashrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.shrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_logout"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/rc."
                      }
                    }
                  ]
                }
              }
            ],
            "must_not": [
              {
                "terms": {
                  "process.name": [
                      "elastic-agent",
                      "elasticsearch-users",
                      "elastic-agent.exe",
                      "metricbeat.exe",
                      "metricbeat",
                      "filebeat.exe",
                      "filebeat",
                      "packetbeat.exe",
                      "packetbeat",
                      "winlogbeat.exe",
                      "winlogbeat"
                  ]
                }
              },
              {
                "terms": {
                  "process.command_line.text": [
                    "elastic-agent",
                    "elasticsearch"
                  ]
                }
              }
            ]
          }
        }
    }
  },
  {
    "id": "datafeed-pad_linux_rare_process_executed_by_user",
    "job_id": "pad_linux_rare_process_executed_by_user",
    "config": {
      "indices": [
        "logs-linux-*"
      ],
      "job_id": "pad_linux_rare_process_executed_by_user",
      "query": {
          "bool": {
            "must": [
              {
                "terms": {
                  "host.os.type": [
                    "linux",
                    "Linux"
                  ]
                }
              },
              {
                "term": {
                  "event.category": "process"
                }
              },
              {
                "terms": {
                  "event.type": [
                    "start",
                    "change"
                  ]
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "process.command_line.text": "LD_PRELOAD"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/etc/ld.so.preload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/root/.ssh/authorized_keys"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "timestamp_timeout=-1"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "!tty_tickets"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "var/spool/cron"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl daemon-reload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw mod user"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw unlock"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "chmod u+s"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo setcap cap_setuid"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "su nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo */root/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*etc/sudoers"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*visudo"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "etc/cron.*/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "trap*SIGINT"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*2000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*4000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl start*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl enable*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bashrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.shrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_logout"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/rc."
                      }
                    }
                  ]
                }
              }
            ],
            "must_not": [
              {
                "terms": {
                  "process.name": [
                      "elastic-agent",
                      "elasticsearch-users",
                      "elastic-agent.exe",
                      "metricbeat.exe",
                      "metricbeat",
                      "filebeat.exe",
                      "filebeat",
                      "packetbeat.exe",
                      "packetbeat",
                      "winlogbeat.exe",
                      "winlogbeat"
                  ]
                }
              },
              {
                "terms": {
                  "process.command_line.text": [
                    "elastic-agent",
                    "elasticsearch"
                  ]
                }
              }
            ]
          }
        }
    }
  },
  {
    "id": "datafeed-pad_linux_high_median_process_command_line_entropy_by_user",
    "job_id": "pad_linux_high_median_process_command_line_entropy_by_user",
    "config": {
      "indices": [
        "logs-linux-*"
      ],
      "job_id": "pad_linux_high_median_process_command_line_entropy_by_user",
      "query": {
          "bool": {
            "must": [
              {
                "terms": {
                  "host.os.type": [
                    "linux",
                    "Linux"
                  ]
                }
              },
              {
                "term": {
                  "event.category": "process"
                }
              },
              {
                "terms": {
                  "event.type": [
                    "start",
                    "change"
                  ]
                }
              },
              {
                "bool": {
                  "should": [
                    {
                      "match_phrase": {
                        "process.command_line.text": "LD_PRELOAD"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/etc/ld.so.preload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "/root/.ssh/authorized_keys"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "timestamp_timeout=-1"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "!tty_tickets"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "var/spool/cron"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl daemon-reload"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw mod user"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "pw unlock"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "chmod u+s"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo setcap cap_setuid"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "su nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo nobody"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo */root/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*etc/sudoers"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "sudo*visudo"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "etc/cron.*/"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "trap*SIGINT"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*2000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "find*-perm*4000"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl start*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "systemctl enable*.service"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bashrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.shrc"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/profile"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/.bash_logout"
                      }
                    },
                    {
                      "match_phrase": {
                        "process.command_line.text": "echo*/etc/rc."
                      }
                    }
                  ]
                }
              }
            ],
            "must_not": [
              {
                "terms": {
                  "process.name": [
                      "elastic-agent",
                      "elasticsearch-users",
                      "elastic-agent.exe",
                      "metricbeat.exe",
                      "metricbeat",
                      "filebeat.exe",
                      "filebeat",
                      "packetbeat.exe",
                      "packetbeat",
                      "winlogbeat.exe",
                      "winlogbeat"
                  ]
                }
              },
              {
                "terms": {
                  "process.command_line.text": [
                    "elastic-agent",
                    "elasticsearch"
                  ]
                }
              }
            ]
          }
        }
    }
  },
  {
    "id": "datafeed-pad_okta_spike_in_group_membership_changes",
    "job_id": "pad_okta_spike_in_group_membership_changes",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_spike_in_group_membership_changes",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "terms": {
                "okta.event_type": ["group.user_membership.add", "group.user_membership.remove"]
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_okta_spike_in_user_lifecycle_management_changes",
    "job_id": "pad_okta_spike_in_user_lifecycle_management_changes",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_spike_in_user_lifecycle_management_changes",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "terms": {
                "okta.event_type": [
                  "user.lifecycle.activate",
                  "user.lifecycle.deactivate",
                  "user.lifecycle.suspend",
                  "user.lifecycle.unsuspend",
                  "user.lifecycle.create",
                  "user.lifecycle.update"
                ]
              }
            }
          ]
        }
      }
    }
  },
          {
    "id": "datafeed-pad_okta_spike_in_group_privilege_changes",
    "job_id": "pad_okta_spike_in_group_privilege_changes",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_spike_in_group_privilege_changes",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "terms": {
                "okta.event_type": ["group.privilege.grant", "group.privilege.revoke"]
              }
            }
          ]
        }
      }
    }
  },
          {
    "id": "datafeed-pad_okta_spike_in_group_application_assignment_changes",
    "job_id": "pad_okta_spike_in_group_application_assignment_changes",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_spike_in_group_application_assignment_changes",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "terms": {
                "okta.event_type": ["group.application_assignment.add", "group.application_assignment.remove"]
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "datafeed-pad_okta_spike_in_group_lifecycle_changes",
    "job_id": "pad_okta_spike_in_group_lifecycle_changes",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_spike_in_group_lifecycle_changes",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "terms": {
                "okta.event_type": ["group.lifecycle.create", "group.lifecycle.delete"]
              }
            }
          ]
        }
      }
    }
  },
    {
    "id": "datafeed-pad_okta_high_sum_concurrent_sessions_by_user",
    "job_id": "pad_okta_high_sum_concurrent_sessions_by_user",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_high_sum_concurrent_sessions_by_user",
      "query": {
          "bool": {
            "filter": [
              {
                "exists": {
                  "field": "source.user.name"
                }
              },
              {
                "exists": {
                  "field": "okta_distinct_ips"
                }
              },
              {
                "range": {
                  "okta_distinct_ips": {
                    "gte": 2
                  }
                }
              },
              {
                "range": {
                  "okta_distinct_countries": {
                    "gte": 2
                  }
                }
              },
              {
                "term": {
                  "okta_session_info.has_end_event": 0
                }
              }
            ]
          }
        }
    }
  },
  {
    "id": "datafeed-pad_okta_rare_source_ip_by_user",
    "job_id": "pad_okta_rare_source_ip_by_user",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_rare_source_ip_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "exists": {
                "field": "source.ip"
              }
            },
            {
              "terms": {
                "okta.event_type": [
                  "group.lifecycle.create",
                  "group.lifecycle.delete",
                  "group.user_membership.add",
                  "group.user_membership.remove",
                  "user.lifecycle.activate",
                  "user.lifecycle.deactivate",
                  "user.lifecycle.suspend",
                  "user.lifecycle.unsuspend",
                  "user.lifecycle.create",
                  "user.lifecycle.update",
                  "group.privilege.grant",
                  "group.privilege.revoke",
                  "group.application_assignment.add",
                  "group.application_assignment.remove"]
              }
            }
          ]
        }
      }
    }
  },
          {
    "id": "datafeed-pad_okta_rare_region_name_by_user",
    "job_id": "pad_okta_rare_region_name_by_user",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_rare_region_name_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "exists": {
                "field": "client.geo.region_name"
              }
            },
            {
              "terms": {
                "okta.event_type": [
                  "group.lifecycle.create",
                  "group.lifecycle.delete",
                  "group.user_membership.add",
                  "group.user_membership.remove",
                  "user.lifecycle.activate",
                  "user.lifecycle.deactivate",
                  "user.lifecycle.suspend",
                  "user.lifecycle.unsuspend",
                  "user.lifecycle.create",
                  "user.lifecycle.update",
                  "group.privilege.grant",
                  "group.privilege.revoke",
                  "group.application_assignment.add",
                  "group.application_assignment.remove"]
              }
            }
          ]
        }
      }
    }
  },
          {
    "id": "datafeed-pad_okta_rare_host_name_by_user",
    "job_id": "pad_okta_rare_host_name_by_user",
    "config": {
      "indices": [
        "logs-okta-*"
      ],
      "job_id": "pad_okta_rare_host_name_by_user",
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "data_stream.dataset": "okta.system"
              }
            },
            {
              "exists": {
                "field": "agent.name"
              }
            },
            {
              "terms": {
                "okta.event_type": [
                  "group.lifecycle.create",
                  "group.lifecycle.delete",
                  "group.user_membership.add",
                  "group.user_membership.remove",
                  "user.lifecycle.activate",
                  "user.lifecycle.deactivate",
                  "user.lifecycle.suspend",
                  "user.lifecycle.unsuspend",
                  "user.lifecycle.create",
                  "user.lifecycle.update",
                  "group.privilege.grant",
                  "group.privilege.revoke",
                  "group.application_assignment.add",
                  "group.application_assignment.remove"]
              }
            }
          ]
        }
      }
    }
  }
]