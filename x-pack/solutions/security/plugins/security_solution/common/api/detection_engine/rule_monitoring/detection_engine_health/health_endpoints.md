# Detection Engine health endpoints

## Rule health endpoint

🚧 NOTE: this endpoint is **partially implemented**. 🚧

```txt
POST /internal/detection_engine/health/_rule
```

Get health overview of a rule. Scope: a given detection rule in the current Kibana space.
Returns:

- health stats at the moment of the API call (rule and its execution summary)
- health stats over a specified period of time ("health interval")
- health stats history within the same interval in the form of a histogram
  (the same stats are calculated over each of the discreet sub-intervals of the whole interval)

Minimal required parameters:

```json
{
  "rule_id": "d4beff10-f045-11ed-89d8-3b6931af10bc"
}
```

Response:

```json
{
  "timings": {
    "requested_at": "2023-05-26T16:09:54.128Z",
    "processed_at": "2023-05-26T16:09:54.778Z",
    "processing_time_ms": 650
  },
  "parameters": {
    "interval": {
      "type": "last_day",
      "granularity": "hour",
      "from": "2023-05-25T16:09:54.128Z",
      "to": "2023-05-26T16:09:54.128Z",
      "duration": "PT24H"
    },
    "rule_id": "d4beff10-f045-11ed-89d8-3b6931af10bc"
  },
  "health": {
    "state_at_the_moment": {
      "rule": {
        "id": "d4beff10-f045-11ed-89d8-3b6931af10bc",
        "updated_at": "2023-05-26T15:44:21.689Z",
        "updated_by": "elastic",
        "created_at": "2023-05-11T21:50:23.830Z",
        "created_by": "elastic",
        "name": "Test rule",
        "tags": ["foo"],
        "interval": "1m",
        "enabled": true,
        "revision": 2,
        "description": "-",
        "risk_score": 21,
        "severity": "low",
        "license": "",
        "output_index": "",
        "meta": {
          "from": "6h",
          "kibana_siem_app_url": "http://localhost:5601/kbn/app/security"
        },
        "author": [],
        "false_positives": [],
        "from": "now-21660s",
        "rule_id": "e46eaaf3-6d81-4cdb-8cbb-b2201a11358b",
        "max_signals": 100,
        "risk_score_mapping": [],
        "severity_mapping": [],
        "threat": [],
        "to": "now",
        "references": [],
        "version": 3,
        "exceptions_list": [],
        "immutable": false,
        "related_integrations": [],
        "required_fields": [],
        "setup": "",
        "type": "query",
        "language": "kuery",
        "index": [
          "apm-*-transaction*",
          "auditbeat-*",
          "endgame-*",
          "filebeat-*",
          "logs-*",
          "packetbeat-*",
          "traces-apm*",
          "winlogbeat-*",
          "-*elastic-cloud-logs-*",
          "foo-*"
        ],
        "query": "*",
        "filters": [],
        "actions": [
          {
            "group": "default",
            "id": "bd59c4e0-f045-11ed-89d8-3b6931af10bc",
            "params": {
              "body": "Hello world"
            },
            "action_type_id": ".webhook",
            "uuid": "f8b87eb0-58bb-4d4b-a584-084d44ab847e",
            "frequency": {
              "summary": true,
              "throttle": null,
              "notifyWhen": "onActiveAlert"
            }
          }
        ],
        "execution_summary": {
          "last_execution": {
            "date": "2023-05-26T16:09:36.848Z",
            "status": "succeeded",
            "status_order": 0,
            "message": "Rule execution completed successfully",
            "metrics": {
              "total_search_duration_ms": 2,
              "execution_gap_duration_s": 80395
            }
          }
        }
      }
    },
    "stats_over_interval": {
      "number_of_executions": {
        "total": 21,
        "by_outcome": {
          "succeeded": 20,
          "warning": 0,
          "failed": 1
        }
      },
      "number_of_logged_messages": {
        "total": 42,
        "by_level": {
          "error": 1,
          "warn": 0,
          "info": 41,
          "debug": 0,
          "trace": 0
        }
      },
      "number_of_detected_gaps": {
        "total": 1,
        "total_duration_s": 80395
      },
      "schedule_delay_ms": {
        "percentiles": {
          "1.0": 3061,
          "5.0": 3083,
          "25.0": 3112,
          "50.0": 6049,
          "75.0": 6069.5,
          "95.0": 100093.79999999986,
          "99.0": 207687
        }
      },
      "execution_duration_ms": {
        "percentiles": {
          "1.0": 226,
          "5.0": 228.2,
          "25.0": 355.5,
          "50.0": 422,
          "75.0": 447,
          "95.0": 677.75,
          "99.0": 719
        }
      },
      "search_duration_ms": {
        "percentiles": {
          "1.0": 0,
          "5.0": 1.1,
          "25.0": 2.75,
          "50.0": 7,
          "75.0": 13.5,
          "95.0": 29.59999999999998,
          "99.0": 45
        }
      },
      "indexing_duration_ms": {
        "percentiles": {
          "1.0": 0,
          "5.0": 0,
          "25.0": 0,
          "50.0": 0,
          "75.0": 0,
          "95.0": 0,
          "99.0": 0
        }
      },
      "top_errors": [
        {
          "count": 1,
          "message": "day were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances"
        }
      ],
      "top_warnings": []
    },
    "history_over_interval": {
      "buckets": [
        {
          "timestamp": "2023-05-26T15:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 12,
              "by_outcome": {
                "succeeded": 11,
                "warning": 0,
                "failed": 1
              }
            },
            "number_of_logged_messages": {
              "total": 24,
              "by_level": {
                "error": 1,
                "warn": 0,
                "info": 23,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 1,
              "total_duration_s": 80395
            },
            "schedule_delay_ms": {
              "percentiles": {
                "1.0": 3106,
                "5.0": 3106.8,
                "25.0": 3124.5,
                "50.0": 6067.5,
                "75.0": 9060.5,
                "95.0": 188124.59999999971,
                "99.0": 207687
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "1.0": 230,
                "5.0": 236.2,
                "25.0": 354,
                "50.0": 405,
                "75.0": 447.5,
                "95.0": 563.3999999999999,
                "99.0": 576
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0.20000000000000018,
                "25.0": 2.5,
                "50.0": 5,
                "75.0": 14,
                "95.0": 42.19999999999996,
                "99.0": 45
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 0,
                "75.0": 0,
                "95.0": 0,
                "99.0": 0
              }
            }
          }
        },
        {
          "timestamp": "2023-05-26T16:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 9,
              "by_outcome": {
                "succeeded": 9,
                "warning": 0,
                "failed": 0
              }
            },
            "number_of_logged_messages": {
              "total": 18,
              "by_level": {
                "error": 0,
                "warn": 0,
                "info": 18,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 0,
              "total_duration_s": 0
            },
            "schedule_delay_ms": {
              "percentiles": {
                "1.0": 3061,
                "5.0": 3061,
                "25.0": 3104.75,
                "50.0": 3115,
                "75.0": 6053,
                "95.0": 6068,
                "99.0": 6068
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "1.0": 226.00000000000003,
                "5.0": 226,
                "25.0": 356,
                "50.0": 436,
                "75.0": 495.5,
                "95.0": 719,
                "99.0": 719
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "1.0": 2,
                "5.0": 2,
                "25.0": 5.75,
                "50.0": 8,
                "75.0": 13.75,
                "95.0": 17,
                "99.0": 17
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 0,
                "75.0": 0,
                "95.0": 0,
                "99.0": 0
              }
            }
          }
        }
      ]
    }
  }
}
```

## Space health endpoint

🚧 NOTE: this endpoint is **partially implemented**. 🚧

```txt
POST /internal/detection_engine/health/_space
GET /internal/detection_engine/health/_space
```

Get health overview of the current Kibana space. Scope: all detection rules in the space.
Returns:

- health stats at the moment of the API call
- health stats over a specified period of time ("health interval")
- health stats history within the same interval in the form of a histogram
  (the same stats are calculated over each of the discreet sub-intervals of the whole interval)

Minimal required parameters for the `POST` route: empty object.

```json
{}
```

The `GET` route doesn't accept any parameters and uses the default parameters instead:

- interval: `last_day`
- granularity: `hour`
- debug: `false`

Response:

```json
{
  "timings": {
    "requested_at": "2023-05-26T16:24:21.628Z",
    "processed_at": "2023-05-26T16:24:22.880Z",
    "processing_time_ms": 1252
  },
  "parameters": {
    "interval": {
      "type": "last_day",
      "granularity": "hour",
      "from": "2023-05-25T16:24:21.628Z",
      "to": "2023-05-26T16:24:21.628Z",
      "duration": "PT24H"
    }
  },
  "health": {
    "state_at_the_moment": {
      "number_of_rules": {
        "all": {
          "total": 777,
          "enabled": 777,
          "disabled": 0
        },
        "by_origin": {
          "prebuilt": {
            "total": 776,
            "enabled": 776,
            "disabled": 0
          },
          "custom": {
            "total": 1,
            "enabled": 1,
            "disabled": 0
          }
        },
        "by_type": {
          "siem.eqlRule": {
            "total": 381,
            "enabled": 381,
            "disabled": 0
          },
          "siem.queryRule": {
            "total": 325,
            "enabled": 325,
            "disabled": 0
          },
          "siem.mlRule": {
            "total": 47,
            "enabled": 47,
            "disabled": 0
          },
          "siem.thresholdRule": {
            "total": 18,
            "enabled": 18,
            "disabled": 0
          },
          "siem.newTermsRule": {
            "total": 4,
            "enabled": 4,
            "disabled": 0
          },
          "siem.indicatorRule": {
            "total": 2,
            "enabled": 2,
            "disabled": 0
          }
        },
        "by_outcome": {
          "warning": {
            "total": 307,
            "enabled": 307,
            "disabled": 0
          },
          "succeeded": {
            "total": 266,
            "enabled": 266,
            "disabled": 0
          },
          "failed": {
            "total": 204,
            "enabled": 204,
            "disabled": 0
          }
        }
      }
    },
    "stats_over_interval": {
      "number_of_executions": {
        "total": 5622,
        "by_outcome": {
          "succeeded": 1882,
          "warning": 2129,
          "failed": 2120
        }
      },
      "number_of_logged_messages": {
        "total": 11756,
        "by_level": {
          "error": 2120,
          "warn": 2129,
          "info": 7507,
          "debug": 0,
          "trace": 0
        }
      },
      "number_of_detected_gaps": {
        "total": 777,
        "total_duration_s": 514415894
      },
      "schedule_delay_ms": {
        "percentiles": {
          "1.0": 216,
          "5.0": 3048.5,
          "25.0": 3105,
          "50.0": 3129,
          "75.0": 6112.355119825708,
          "95.0": 134006,
          "99.0": 195578
        }
      },
      "execution_duration_ms": {
        "percentiles": {
          "1.0": 275,
          "5.0": 323.375,
          "25.0": 370.80555555555554,
          "50.0": 413.1122337092731,
          "75.0": 502.25233127864715,
          "95.0": 685.8055555555555,
          "99.0": 1194.75
        }
      },
      "search_duration_ms": {
        "percentiles": {
          "1.0": 0,
          "5.0": 0,
          "25.0": 0,
          "50.0": 0,
          "75.0": 15,
          "95.0": 30,
          "99.0": 99.44000000000005
        }
      },
      "indexing_duration_ms": {
        "percentiles": {
          "1.0": 0,
          "5.0": 0,
          "25.0": 0,
          "50.0": 0,
          "75.0": 0,
          "95.0": 0,
          "99.0": 0
        }
      },
      "top_errors": [
        {
          "count": 1202,
          "message": "An error occurred during rule execution message verification_exception"
        },
        {
          "count": 777,
          "message": "were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances"
        },
        {
          "count": 3,
          "message": "An error occurred during rule execution message rare_error_code missing"
        },
        {
          "count": 3,
          "message": "An error occurred during rule execution message v3_windows_anomalous_path_activity missing"
        },
        {
          "count": 3,
          "message": "An error occurred during rule execution message v3_windows_rare_user_type10_remote_login missing"
        }
      ],
      "top_warnings": [
        {
          "count": 2129,
          "message": "This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching was found This warning will continue to appear until matching index is created or this rule is disabled"
        }
      ]
    },
    "history_over_interval": {
      "buckets": [
        {
          "timestamp": "2023-05-26T15:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 2245,
              "by_outcome": {
                "succeeded": 566,
                "warning": 849,
                "failed": 1336
              }
            },
            "number_of_logged_messages": {
              "total": 4996,
              "by_level": {
                "error": 1336,
                "warn": 849,
                "info": 2811,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 777,
              "total_duration_s": 514415894
            },
            "schedule_delay_ms": {
              "percentiles": {
                "1.0": 256,
                "5.0": 3086.9722222222217,
                "25.0": 3133,
                "50.0": 6126,
                "75.0": 59484.25,
                "95.0": 179817.25,
                "99.0": 202613
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "1.0": 280.6,
                "5.0": 327.7,
                "25.0": 371.5208333333333,
                "50.0": 415.6190476190476,
                "75.0": 505.7642857142857,
                "95.0": 740.4375,
                "99.0": 1446.1500000000005
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 0,
                "75.0": 8,
                "95.0": 25,
                "99.0": 46
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 0,
                "75.0": 0,
                "95.0": 0,
                "99.0": 0
              }
            }
          }
        },
        {
          "timestamp": "2023-05-26T16:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 3363,
              "by_outcome": {
                "succeeded": 1316,
                "warning": 1280,
                "failed": 784
              }
            },
            "number_of_logged_messages": {
              "total": 6760,
              "by_level": {
                "error": 784,
                "warn": 1280,
                "info": 4696,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 0,
              "total_duration_s": 0
            },
            "schedule_delay_ms": {
              "percentiles": {
                "1.0": 207,
                "5.0": 3042,
                "25.0": 3098.46511627907,
                "50.0": 3112,
                "75.0": 3145.2820512820517,
                "95.0": 6100.571428571428,
                "99.0": 6123
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "1.0": 275,
                "5.0": 319.85714285714283,
                "25.0": 370.0357142857143,
                "50.0": 410.79999229108853,
                "75.0": 500.7692307692308,
                "95.0": 675,
                "99.0": 781.3999999999996
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 9,
                "75.0": 17.555555555555557,
                "95.0": 34,
                "99.0": 110.5
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "1.0": 0,
                "5.0": 0,
                "25.0": 0,
                "50.0": 0,
                "75.0": 0,
                "95.0": 0,
                "99.0": 0
              }
            }
          }
        }
      ]
    }
  }
}
```

## Cluster health endpoint

🚧 NOTE: this endpoint is **partially implemented**. 🚧

```txt
POST /internal/detection_engine/health/_cluster
GET /internal/detection_engine/health/_cluster
```

Minimal required parameters for the `POST` route: empty object.

```json
{}
```

The `GET` route doesn't accept any parameters and uses the default parameters instead:

- interval: `last_day`
- granularity: `hour`
- debug: `false`

Response:

```json
{
  "timings": {
    "requested_at": "2023-09-15T13:41:44.565Z",
    "processed_at": "2023-09-15T13:41:44.648Z",
    "processing_time_ms": 83
  },
  "parameters": {
    "interval": {
      "type": "last_day",
      "granularity": "hour",
      "from": "2023-09-14T13:41:44.565Z",
      "to": "2023-09-15T13:41:44.565Z",
      "duration": "PT24H"
    }
  },
  "health": {
    "state_at_the_moment": {
      "number_of_rules": {
        "all": {
          "total": 40,
          "enabled": 40,
          "disabled": 0
        },
        "by_origin": {
          "prebuilt": {
            "total": 40,
            "enabled": 40,
            "disabled": 0
          },
          "custom": {
            "total": 0,
            "enabled": 0,
            "disabled": 0
          }
        },
        "by_type": {
          "siem.queryRule": {
            "total": 28,
            "enabled": 28,
            "disabled": 0
          },
          "siem.mlRule": {
            "total": 10,
            "enabled": 10,
            "disabled": 0
          },
          "siem.newTermsRule": {
            "total": 2,
            "enabled": 2,
            "disabled": 0
          }
        },
        "by_outcome": {
          "warning": {
            "total": 30,
            "enabled": 30,
            "disabled": 0
          },
          "failed": {
            "total": 10,
            "enabled": 10,
            "disabled": 0
          }
        }
      }
    },
    "stats_over_interval": {
      "number_of_executions": {
        "total": 290,
        "by_outcome": {
          "succeeded": 0,
          "warning": 240,
          "failed": 90
        }
      },
      "number_of_logged_messages": {
        "total": 620,
        "by_level": {
          "error": 90,
          "warn": 240,
          "info": 290,
          "debug": 0,
          "trace": 0
        }
      },
      "number_of_detected_gaps": {
        "total": 40,
        "total_duration_s": 12986680
      },
      "schedule_delay_ms": {
        "percentiles": {
          "50.0": 261,
          "95.0": 330999215.3,
          "99.0": 331057597,
          "99.9": 331057597
        }
      },
      "execution_duration_ms": {
        "percentiles": {
          "50.0": 530.5,
          "95.0": 1864.350000000016,
          "99.0": 13863.33,
          "99.9": 13871.133
        }
      },
      "search_duration_ms": {
        "percentiles": {
          "50.0": 0,
          "95.0": 0,
          "99.0": 0,
          "99.9": 0
        }
      },
      "indexing_duration_ms": {
        "percentiles": {
          "50.0": 0,
          "95.0": 0,
          "99.0": 0,
          "99.9": 0
        }
      },
      "top_errors": [
        {
          "count": 40,
          "message": "days were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances"
        },
        {
          "count": 10,
          "message": "An error occurred during rule execution message high_distinct_count_error_message missing"
        },
        {
          "count": 10,
          "message": "An error occurred during rule execution message rare_error_code missing"
        },
        {
          "count": 10,
          "message": "An error occurred during rule execution message rare_method_for_a_city missing"
        },
        {
          "count": 10,
          "message": "An error occurred during rule execution message rare_method_for_a_username missing"
        }
      ],
      "top_warnings": [
        {
          "count": 240,
          "message": "This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching filebeat logs-aws was found This warning will continue to appear until matching index is created or this rule is disabled"
        }
      ]
    },
    "history_over_interval": {
      "buckets": [
        {
          "timestamp": "2023-09-15T12:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 110,
              "by_outcome": {
                "succeeded": 0,
                "warning": 90,
                "failed": 60
              }
            },
            "number_of_logged_messages": {
              "total": 260,
              "by_level": {
                "error": 60,
                "warn": 90,
                "info": 110,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 40,
              "total_duration_s": 12986680
            },
            "schedule_delay_ms": {
              "percentiles": {
                "50.0": 2975,
                "95.0": 331046564.55,
                "99.0": 331057597,
                "99.9": 331057597
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "50.0": 677.5,
                "95.0": 8943.65,
                "99.0": 13868.73,
                "99.9": 13871.673
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "50.0": 0,
                "95.0": 0,
                "99.0": 0,
                "99.9": 0
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "50.0": 0,
                "95.0": 0,
                "99.0": 0,
                "99.9": 0
              }
            }
          }
        },
        {
          "timestamp": "2023-09-15T13:00:00.000Z",
          "stats": {
            "number_of_executions": {
              "total": 180,
              "by_outcome": {
                "succeeded": 0,
                "warning": 150,
                "failed": 30
              }
            },
            "number_of_logged_messages": {
              "total": 360,
              "by_level": {
                "error": 30,
                "warn": 150,
                "info": 180,
                "debug": 0,
                "trace": 0
              }
            },
            "number_of_detected_gaps": {
              "total": 0,
              "total_duration_s": 0
            },
            "schedule_delay_ms": {
              "percentiles": {
                "50.0": 246.5,
                "95.0": 3245.35,
                "99.0": 3905.0100000000216,
                "99.9": 6173.243000000005
              }
            },
            "execution_duration_ms": {
              "percentiles": {
                "50.0": 503.5,
                "95.0": 692.15,
                "99.0": 758.63,
                "99.9": 763.4630000000001
              }
            },
            "search_duration_ms": {
              "percentiles": {
                "50.0": 0,
                "95.0": 0,
                "99.0": 0,
                "99.9": 0
              }
            },
            "indexing_duration_ms": {
              "percentiles": {
                "50.0": 0,
                "95.0": 0,
                "99.0": 0,
                "99.9": 0
              }
            }
          }
        }
      ]
    }
  }
}
```

## Optional parameters

All the three endpoints accept optional `interval` and `debug` request parameters.

### Health interval

You can change the interval over which the health stats will be calculated. If you don't specify it, by default health stats will be calculated over the last day with the granularity of 1 hour.

```json
{
  "interval": {
    "type": "last_week",
    "granularity": "day"
  }
}
```

You can also specify a custom date range with exact interval bounds.

```json
{
  "interval": {
    "type": "custom_range",
    "granularity": "minute",
    "from": "2023-05-20T16:24:21.628Z",
    "to": "2023-05-26T16:24:21.628Z"
  }
}
```

Please keep in mind that requesting large intervals with small granularity can generate substantial load on the system and enormous API responses.

### Debug mode

You can also include various debug information in the response, such as queries and aggregations sent to Elasticsearch and response received from it.

```json
{
  "debug": true
}
```

In the response you will find something like that:

```json
{
  "health": {
    "debug": {
      "rulesClient": {
        "request": {
          "aggs": {
            "rulesByEnabled": {
              "terms": {
                "field": "alert.attributes.enabled"
              }
            },
            "rulesByOrigin": {
              "terms": {
                "field": "alert.attributes.params.immutable"
              },
              "aggs": {
                "rulesByEnabled": {
                  "terms": {
                    "field": "alert.attributes.enabled"
                  }
                }
              }
            },
            "rulesByType": {
              "terms": {
                "field": "alert.attributes.alertTypeId"
              },
              "aggs": {
                "rulesByEnabled": {
                  "terms": {
                    "field": "alert.attributes.enabled"
                  }
                }
              }
            },
            "rulesByOutcome": {
              "terms": {
                "field": "alert.attributes.lastRun.outcome"
              },
              "aggs": {
                "rulesByEnabled": {
                  "terms": {
                    "field": "alert.attributes.enabled"
                  }
                }
              }
            }
          }
        },
        "response": {
          "aggregations": {
            "rulesByOutcome": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "warning",
                  "doc_count": 307,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 307
                      }
                    ]
                  }
                },
                {
                  "key": "succeeded",
                  "doc_count": 266,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 266
                      }
                    ]
                  }
                },
                {
                  "key": "failed",
                  "doc_count": 204,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 204
                      }
                    ]
                  }
                }
              ]
            },
            "rulesByType": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "siem.eqlRule",
                  "doc_count": 381,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 381
                      }
                    ]
                  }
                },
                {
                  "key": "siem.queryRule",
                  "doc_count": 325,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 325
                      }
                    ]
                  }
                },
                {
                  "key": "siem.mlRule",
                  "doc_count": 47,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 47
                      }
                    ]
                  }
                },
                {
                  "key": "siem.thresholdRule",
                  "doc_count": 18,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 18
                      }
                    ]
                  }
                },
                {
                  "key": "siem.newTermsRule",
                  "doc_count": 4,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 4
                      }
                    ]
                  }
                },
                {
                  "key": "siem.indicatorRule",
                  "doc_count": 2,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 2
                      }
                    ]
                  }
                }
              ]
            },
            "rulesByOrigin": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "true",
                  "doc_count": 776,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 776
                      }
                    ]
                  }
                },
                {
                  "key": "false",
                  "doc_count": 1,
                  "rulesByEnabled": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": 1,
                        "key_as_string": "true",
                        "doc_count": 1
                      }
                    ]
                  }
                }
              ]
            },
            "rulesByEnabled": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": 1,
                  "key_as_string": "true",
                  "doc_count": 777
                }
              ]
            }
          }
        }
      },
      "eventLog": {
        "request": {
          "aggs": {
            "totalExecutions": {
              "cardinality": {
                "field": "kibana.alert.rule.execution.uuid"
              }
            },
            "executeEvents": {
              "filter": {
                "term": {
                  "event.action": "execute"
                }
              },
              "aggs": {
                "executionDurationMs": {
                  "percentiles": {
                    "field": "kibana.alert.rule.execution.metrics.total_run_duration_ms",
                    "missing": 0,
                    "percents": [1, 5, 25, 50, 75, 95, 99]
                  }
                },
                "scheduleDelayNs": {
                  "percentiles": {
                    "field": "kibana.task.schedule_delay",
                    "missing": 0,
                    "percents": [1, 5, 25, 50, 75, 95, 99]
                  }
                }
              }
            },
            "statusChangeEvents": {
              "filter": {
                "bool": {
                  "filter": [
                    {
                      "term": {
                        "event.action": "status-change"
                      }
                    }
                  ],
                  "must_not": [
                    {
                      "terms": {
                        "kibana.alert.rule.execution.status": ["running", "going to run"]
                      }
                    }
                  ]
                }
              },
              "aggs": {
                "executionsByStatus": {
                  "terms": {
                    "field": "kibana.alert.rule.execution.status"
                  }
                }
              }
            },
            "executionMetricsEvents": {
              "filter": {
                "term": {
                  "event.action": "execution-metrics"
                }
              },
              "aggs": {
                "gaps": {
                  "filter": {
                    "exists": {
                      "field": "kibana.alert.rule.execution.metrics.execution_gap_duration_s"
                    }
                  },
                  "aggs": {
                    "totalGapDurationS": {
                      "sum": {
                        "field": "kibana.alert.rule.execution.metrics.execution_gap_duration_s"
                      }
                    }
                  }
                },
                "searchDurationMs": {
                  "percentiles": {
                    "field": "kibana.alert.rule.execution.metrics.total_search_duration_ms",
                    "missing": 0,
                    "percents": [1, 5, 25, 50, 75, 95, 99]
                  }
                },
                "indexingDurationMs": {
                  "percentiles": {
                    "field": "kibana.alert.rule.execution.metrics.total_indexing_duration_ms",
                    "missing": 0,
                    "percents": [1, 5, 25, 50, 75, 95, 99]
                  }
                }
              }
            },
            "messageContainingEvents": {
              "filter": {
                "terms": {
                  "event.action": ["status-change", "message"]
                }
              },
              "aggs": {
                "messagesByLogLevel": {
                  "terms": {
                    "field": "log.level"
                  }
                },
                "errors": {
                  "filter": {
                    "term": {
                      "log.level": "error"
                    }
                  },
                  "aggs": {
                    "topErrors": {
                      "categorize_text": {
                        "field": "message",
                        "size": 5,
                        "similarity_threshold": 99
                      }
                    }
                  }
                },
                "warnings": {
                  "filter": {
                    "term": {
                      "log.level": "warn"
                    }
                  },
                  "aggs": {
                    "topWarnings": {
                      "categorize_text": {
                        "field": "message",
                        "size": 5,
                        "similarity_threshold": 99
                      }
                    }
                  }
                }
              }
            },
            "statsHistory": {
              "date_histogram": {
                "field": "@timestamp",
                "calendar_interval": "hour"
              },
              "aggs": {
                "totalExecutions": {
                  "cardinality": {
                    "field": "kibana.alert.rule.execution.uuid"
                  }
                },
                "executeEvents": {
                  "filter": {
                    "term": {
                      "event.action": "execute"
                    }
                  },
                  "aggs": {
                    "executionDurationMs": {
                      "percentiles": {
                        "field": "kibana.alert.rule.execution.metrics.total_run_duration_ms",
                        "missing": 0,
                        "percents": [1, 5, 25, 50, 75, 95, 99]
                      }
                    },
                    "scheduleDelayNs": {
                      "percentiles": {
                        "field": "kibana.task.schedule_delay",
                        "missing": 0,
                        "percents": [1, 5, 25, 50, 75, 95, 99]
                      }
                    }
                  }
                },
                "statusChangeEvents": {
                  "filter": {
                    "bool": {
                      "filter": [
                        {
                          "term": {
                            "event.action": "status-change"
                          }
                        }
                      ],
                      "must_not": [
                        {
                          "terms": {
                            "kibana.alert.rule.execution.status": ["running", "going to run"]
                          }
                        }
                      ]
                    }
                  },
                  "aggs": {
                    "executionsByStatus": {
                      "terms": {
                        "field": "kibana.alert.rule.execution.status"
                      }
                    }
                  }
                },
                "executionMetricsEvents": {
                  "filter": {
                    "term": {
                      "event.action": "execution-metrics"
                    }
                  },
                  "aggs": {
                    "gaps": {
                      "filter": {
                        "exists": {
                          "field": "kibana.alert.rule.execution.metrics.execution_gap_duration_s"
                        }
                      },
                      "aggs": {
                        "totalGapDurationS": {
                          "sum": {
                            "field": "kibana.alert.rule.execution.metrics.execution_gap_duration_s"
                          }
                        }
                      }
                    },
                    "searchDurationMs": {
                      "percentiles": {
                        "field": "kibana.alert.rule.execution.metrics.total_search_duration_ms",
                        "missing": 0,
                        "percents": [1, 5, 25, 50, 75, 95, 99]
                      }
                    },
                    "indexingDurationMs": {
                      "percentiles": {
                        "field": "kibana.alert.rule.execution.metrics.total_indexing_duration_ms",
                        "missing": 0,
                        "percents": [1, 5, 25, 50, 75, 95, 99]
                      }
                    }
                  }
                },
                "messageContainingEvents": {
                  "filter": {
                    "terms": {
                      "event.action": ["status-change", "message"]
                    }
                  },
                  "aggs": {
                    "messagesByLogLevel": {
                      "terms": {
                        "field": "log.level"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "response": {
          "aggregations": {
            "statsHistory": {
              "buckets": [
                {
                  "key_as_string": "2023-05-26T15:00:00.000Z",
                  "key": 1685113200000,
                  "doc_count": 11388,
                  "statusChangeEvents": {
                    "doc_count": 2751,
                    "executionsByStatus": {
                      "doc_count_error_upper_bound": 0,
                      "sum_other_doc_count": 0,
                      "buckets": [
                        {
                          "key": "failed",
                          "doc_count": 1336
                        },
                        {
                          "key": "partial failure",
                          "doc_count": 849
                        },
                        {
                          "key": "succeeded",
                          "doc_count": 566
                        }
                      ]
                    }
                  },
                  "totalExecutions": {
                    "value": 2245
                  },
                  "messageContainingEvents": {
                    "doc_count": 4996,
                    "messagesByLogLevel": {
                      "doc_count_error_upper_bound": 0,
                      "sum_other_doc_count": 0,
                      "buckets": [
                        {
                          "key": "info",
                          "doc_count": 2811
                        },
                        {
                          "key": "error",
                          "doc_count": 1336
                        },
                        {
                          "key": "warn",
                          "doc_count": 849
                        }
                      ]
                    }
                  },
                  "executeEvents": {
                    "doc_count": 2245,
                    "scheduleDelayNs": {
                      "values": {
                        "1.0": 256000000,
                        "5.0": 3086972222.222222,
                        "25.0": 3133000000,
                        "50.0": 6126000000,
                        "75.0": 59484250000,
                        "95.0": 179817250000,
                        "99.0": 202613000000
                      }
                    },
                    "executionDurationMs": {
                      "values": {
                        "1.0": 280.6,
                        "5.0": 327.7,
                        "25.0": 371.5208333333333,
                        "50.0": 415.6190476190476,
                        "75.0": 505.575,
                        "95.0": 740.4375,
                        "99.0": 1446.1500000000005
                      }
                    }
                  },
                  "executionMetricsEvents": {
                    "doc_count": 1902,
                    "searchDurationMs": {
                      "values": {
                        "1.0": 0,
                        "5.0": 0,
                        "25.0": 0,
                        "50.0": 0,
                        "75.0": 8,
                        "95.0": 25,
                        "99.0": 46
                      }
                    },
                    "gaps": {
                      "doc_count": 777,
                      "totalGapDurationS": {
                        "value": 514415894
                      }
                    },
                    "indexingDurationMs": {
                      "values": {
                        "1.0": 0,
                        "5.0": 0,
                        "25.0": 0,
                        "50.0": 0,
                        "75.0": 0,
                        "95.0": 0,
                        "99.0": 0
                      }
                    }
                  }
                },
                {
                  "key_as_string": "2023-05-26T16:00:00.000Z",
                  "key": 1685116800000,
                  "doc_count": 28325,
                  "statusChangeEvents": {
                    "doc_count": 6126,
                    "executionsByStatus": {
                      "doc_count_error_upper_bound": 0,
                      "sum_other_doc_count": 0,
                      "buckets": [
                        {
                          "key": "succeeded",
                          "doc_count": 2390
                        },
                        {
                          "key": "partial failure",
                          "doc_count": 2305
                        },
                        {
                          "key": "failed",
                          "doc_count": 1431
                        }
                      ]
                    }
                  },
                  "totalExecutions": {
                    "value": 6170
                  },
                  "messageContainingEvents": {
                    "doc_count": 12252,
                    "messagesByLogLevel": {
                      "doc_count_error_upper_bound": 0,
                      "sum_other_doc_count": 0,
                      "buckets": [
                        {
                          "key": "info",
                          "doc_count": 8516
                        },
                        {
                          "key": "warn",
                          "doc_count": 2305
                        },
                        {
                          "key": "error",
                          "doc_count": 1431
                        }
                      ]
                    }
                  },
                  "executeEvents": {
                    "doc_count": 6126,
                    "scheduleDelayNs": {
                      "values": {
                        "1.0": 193000000,
                        "5.0": 3017785185.1851854,
                        "25.0": 3086000000,
                        "50.0": 3105877192.982456,
                        "75.0": 3134645161.290323,
                        "95.0": 6081772222.222222,
                        "99.0": 6122000000
                      }
                    },
                    "executionDurationMs": {
                      "values": {
                        "1.0": 275.17333333333335,
                        "5.0": 324.8014285714285,
                        "25.0": 377.0752688172043,
                        "50.0": 431,
                        "75.0": 532.3870967741935,
                        "95.0": 720.6761904761904,
                        "99.0": 922.6799999999985
                      }
                    }
                  },
                  "executionMetricsEvents": {
                    "doc_count": 3821,
                    "searchDurationMs": {
                      "values": {
                        "1.0": 0,
                        "5.0": 0,
                        "25.0": 0,
                        "50.0": 9.8,
                        "75.0": 18,
                        "95.0": 40.17499999999999,
                        "99.0": 124
                      }
                    },
                    "gaps": {
                      "doc_count": 0,
                      "totalGapDurationS": {
                        "value": 0
                      }
                    },
                    "indexingDurationMs": {
                      "values": {
                        "1.0": 0,
                        "5.0": 0,
                        "25.0": 0,
                        "50.0": 0,
                        "75.0": 0,
                        "95.0": 0,
                        "99.0": 0
                      }
                    }
                  }
                }
              ]
            },
            "statusChangeEvents": {
              "doc_count": 8877,
              "executionsByStatus": {
                "doc_count_error_upper_bound": 0,
                "sum_other_doc_count": 0,
                "buckets": [
                  {
                    "key": "partial failure",
                    "doc_count": 3154
                  },
                  {
                    "key": "succeeded",
                    "doc_count": 2956
                  },
                  {
                    "key": "failed",
                    "doc_count": 2767
                  }
                ]
              }
            },
            "totalExecutions": {
              "value": 8455
            },
            "messageContainingEvents": {
              "doc_count": 17248,
              "messagesByLogLevel": {
                "doc_count_error_upper_bound": 0,
                "sum_other_doc_count": 0,
                "buckets": [
                  {
                    "key": "info",
                    "doc_count": 11327
                  },
                  {
                    "key": "warn",
                    "doc_count": 3154
                  },
                  {
                    "key": "error",
                    "doc_count": 2767
                  }
                ]
              },
              "warnings": {
                "doc_count": 3154,
                "topWarnings": {
                  "buckets": [
                    {
                      "doc_count": 3154,
                      "key": "This rule is attempting to query data from Elasticsearch indices listed in the Index pattern section of the rule definition however no index matching was found This warning will continue to appear until matching index is created or this rule is disabled",
                      "regex": ".*?This.+?rule.+?is.+?attempting.+?to.+?query.+?data.+?from.+?Elasticsearch.+?indices.+?listed.+?in.+?the.+?Index.+?pattern.+?section.+?of.+?the.+?rule.+?definition.+?however.+?no.+?index.+?matching.+?was.+?found.+?This.+?warning.+?will.+?continue.+?to.+?appear.+?until.+?matching.+?index.+?is.+?created.+?or.+?this.+?rule.+?is.+?disabled.*?",
                      "max_matching_length": 342
                    }
                  ]
                }
              },
              "errors": {
                "doc_count": 2767,
                "topErrors": {
                  "buckets": [
                    {
                      "doc_count": 1802,
                      "key": "An error occurred during rule execution message verification_exception",
                      "regex": ".*?An.+?error.+?occurred.+?during.+?rule.+?execution.+?message.+?verification_exception.*?",
                      "max_matching_length": 2064
                    },
                    {
                      "doc_count": 777,
                      "key": "were not queried between this rule execution and the last execution so signals may have been missed Consider increasing your look behind time or adding more Kibana instances",
                      "regex": ".*?were.+?not.+?queried.+?between.+?this.+?rule.+?execution.+?and.+?the.+?last.+?execution.+?so.+?signals.+?may.+?have.+?been.+?missed.+?Consider.+?increasing.+?your.+?look.+?behind.+?time.+?or.+?adding.+?more.+?Kibana.+?instances.*?",
                      "max_matching_length": 216
                    },
                    {
                      "doc_count": 4,
                      "key": "An error occurred during rule execution message rare_error_code missing",
                      "regex": ".*?An.+?error.+?occurred.+?during.+?rule.+?execution.+?message.+?rare_error_code.+?missing.*?",
                      "max_matching_length": 82
                    },
                    {
                      "doc_count": 4,
                      "key": "An error occurred during rule execution message v3_windows_anomalous_path_activity missing",
                      "regex": ".*?An.+?error.+?occurred.+?during.+?rule.+?execution.+?message.+?v3_windows_anomalous_path_activity.+?missing.*?",
                      "max_matching_length": 103
                    },
                    {
                      "doc_count": 4,
                      "key": "An error occurred during rule execution message v3_windows_rare_user_type10_remote_login missing",
                      "regex": ".*?An.+?error.+?occurred.+?during.+?rule.+?execution.+?message.+?v3_windows_rare_user_type10_remote_login.+?missing.*?",
                      "max_matching_length": 110
                    }
                  ]
                }
              }
            },
            "executeEvents": {
              "doc_count": 8371,
              "scheduleDelayNs": {
                "values": {
                  "1.0": 206000000,
                  "5.0": 3027000000,
                  "25.0": 3092000000,
                  "50.0": 3116000000,
                  "75.0": 3278666666.6666665,
                  "95.0": 99656950000,
                  "99.0": 186632790000
                }
              },
              "executionDurationMs": {
                "values": {
                  "1.0": 275.5325,
                  "5.0": 326.07857142857137,
                  "25.0": 375.68969144460027,
                  "50.0": 427,
                  "75.0": 526.2948717948718,
                  "95.0": 727.2480952380952,
                  "99.0": 1009.5299999999934
                }
              }
            },
            "executionMetricsEvents": {
              "doc_count": 5723,
              "searchDurationMs": {
                "values": {
                  "1.0": 0,
                  "5.0": 0,
                  "25.0": 0,
                  "50.0": 4,
                  "75.0": 16,
                  "95.0": 34.43846153846145,
                  "99.0": 116.51333333333302
                }
              },
              "gaps": {
                "doc_count": 777,
                "totalGapDurationS": {
                  "value": 514415894
                }
              },
              "indexingDurationMs": {
                "values": {
                  "1.0": 0,
                  "5.0": 0,
                  "25.0": 0,
                  "50.0": 0,
                  "75.0": 0,
                  "95.0": 0,
                  "99.0": 0
                }
              }
            }
          }
        }
      }
    }
  }
}
```
