export const PRIVMON_ML_JOBS = [
{
    "id": "pad_windows_high_count_special_logon_events",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects unusually high special logon events initiated by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of special logon events",
            "function": "high_non_zero_count",
            "by_field_name": "event.action",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "winlog.event_data.SubjectUserName",
        "winlog.event_data.PrivilegeList",
        "winlog.event_data.TargetUserName",
        "process.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_high_count_special_privilege_use_events",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects unusually high special privilege use events initiated by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of special privilege use events",
            "function": "high_non_zero_count",
            "by_field_name": "event.action",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "winlog.event_data.SubjectUserName",
        "winlog.event_data.PrivilegeList",
        "process.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_high_count_group_management_events",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects unusually high security group management events initiated by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of security group management events",
            "function": "high_non_zero_count",
            "by_field_name": "event.action",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "winlog.event_data.SubjectUserName",
        "group.name",
        "winlog.event_data.TargetUserName"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_high_count_user_account_management_events",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects unusually high security user account management events initiated by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of security user account management events",
            "function": "high_non_zero_count",
            "by_field_name": "event.action",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "winlog.event_data.SubjectUserName",
        "winlog.event_data.TargetUserName"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_rare_privilege_assigned_to_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual privilege type assigned to a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare privilege type by user name",
            "function": "rare",
            "by_field_name": "privilege_type",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "privilege_type",
        "event.action"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_rare_group_name_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual group name accessed by a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare group name by user name",
            "function": "rare",
            "by_field_name": "group.name",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "group.name",
        "winlog.event_data.TargetUserName",
        "event.action"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_rare_device_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual device accessed by a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare device name by user name",
            "function": "rare",
            "by_field_name": "host.name",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "group.name",
        "winlog.event_data.PrivilegeList",
        "event.action"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_rare_source_ip_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual source IP address accessed by a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare source IP by user name",
            "function": "rare",
            "by_field_name": "source.ip",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "source.ip",
        "winlog.event_data.PrivilegeList",
        "event.action"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_windows_rare_region_name_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual region name for a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare region name by user",
            "function": "rare",
            "by_field_name": "source.geo.region_name",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "source.geo.city_name",
        "source.geo.country_name",
        "winlog.event_data.PrivilegeList",
        "event.action"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_linux_high_count_privileged_process_events_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects a spike in privileged commands executed by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of privileged processes by user name",
            "function": "high_non_zero_count",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "process.name",
        "process.command_line"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_linux_rare_process_executed_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects a rare process executed by a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare process by user name",
            "function": "rare",
            "by_field_name": "process.name",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "process.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_linux_high_median_process_command_line_entropy_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects process command lines executed by a user with an abnormally high median entropy value",
    "analysis_config": {
        "bucket_span": "30m",
        "detectors": [
        {
            "detector_description": "High median of process argument count by user name",
            "function": "high_median",
            "field_name": "process.command_line_entropy",
            "partition_field_name": "user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "host.name",
        "user.name",
        "process.command_line"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_spike_in_group_membership_changes",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects spike in group membership change events by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of group membership okta events by user name",
            "function": "high_non_zero_count",
            "by_field_name": "okta.event_type",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "agent.name",
            "source.user.name",
            "source.user.full_name",
            "user.target.full_name",
            "user.target.group.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_spike_in_user_lifecycle_management_changes",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects spike in user lifecycle management change events by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of user lifecycle management okta events by user name",
            "function": "high_non_zero_count",
            "by_field_name": "okta.event_type",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "agent.name",
            "source.user.name",
            "source.user.full_name",
            "user.target.full_name",
            "user.target.group.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_spike_in_group_privilege_changes",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects spike in group privilege change events by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of group privilege okta events by user name",
            "function": "high_non_zero_count",
            "by_field_name": "okta.event_type",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "agent.name",
            "source.user.name",
            "source.user.full_name",
            "user.target.full_name",
            "user.target.group.name",
            "okta.debug_context.debug_data.privilegeGranted",
            "okta.debug_context.debug_data.privilegeRevoked"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_spike_in_group_application_assignment_changes",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects spike in group application assignment change events by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of group application assignment okta events by user name",
            "function": "high_non_zero_count",
            "by_field_name": "okta.event_type",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "agent.name",
            "source.user.name",
            "source.user.full_name",
            "user.target.group.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_spike_in_group_lifecycle_changes",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects spike in group lifecycle change events by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High count of group lifecycle okta events by user name",
            "function": "high_non_zero_count",
            "by_field_name": "okta.event_type",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "agent.name",
            "source.user.name",
            "source.user.full_name",
            "user.target.group.name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_high_sum_concurrent_sessions_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual sum of active sessions started by a user.",
    "analysis_config": {
        "bucket_span": "3h",
        "detectors": [
        {
            "detector_description": "High sum of distinct source ips by user name",
            "function": "high_sum",
            "field_name": "okta_distinct_ips",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
            "source.user.name",
            "agent.name",
            "source.user.full_name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_rare_source_ip_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual source IP address accessed by a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare source ip by user name",
            "function": "rare",
            "by_field_name": "source.ip",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "agent.name",
        "source.user.full_name",
        "user.target.group.name",
        "okta.event_type"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_rare_region_name_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual region name for a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare region name by user name",
            "function": "rare",
            "by_field_name": "client.geo.region_name",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "agent.name",
        "source.user.full_name",
        "user.target.group.name",
        "okta.event_type",
        "client.geo.country_name"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
},
{
    "id": "pad_okta_rare_host_name_by_user",
    "config": {
    "groups": [
        "security",
        "pad"
    ],
    "description": "Detects an unusual host name for a user.",
    "analysis_config": {
        "bucket_span": "1h",
        "detectors": [
        {
            "detector_description": "Rare host name by user name",
            "function": "rare",
            "by_field_name": "agent.name",
            "partition_field_name": "source.user.name",
            "detector_index": 0
        }
        ],
        "influencers": [
        "agent.name",
        "source.user.full_name",
        "user.target.group.name",
        "okta.event_type"
        ]
    },
    "data_description": {
        "time_field": "@timestamp",
        "time_format": "epoch_ms"
    },
    "custom_settings": {
        "created_by": "ml-module-pad"
    }
    }
    },
];