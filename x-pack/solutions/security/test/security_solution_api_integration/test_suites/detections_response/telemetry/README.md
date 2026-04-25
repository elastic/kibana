These are tests for the telemetry rules within "security_solution/server/usage" and "security_solution/server/lib/telemetry" 
* task_based (security_solution/server/lib/telemetry)
* usage_collector (security_solution/server/usage)

Under usage_collector, these are tests around each of the rule types to affirm they work such as query, eql, etc... This includes
legacy notifications. Once legacy notifications are moved, tests specific to it can be removed.

Under task_based, these are tests around task based types such as "detection_rules" and "security_lists"
