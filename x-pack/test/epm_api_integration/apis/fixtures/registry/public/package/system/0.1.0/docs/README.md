# System Integration

The System module allows you to monitor your servers. Because the System module
always applies to the local server, the `hosts` config option is not needed.

The default metricsets are `cpu`, `load`, `memory`, `network`, `process`, and
`process_summary`. To disable a default metricset, comment it out in the
`modules.d/system.yml` configuration file. If _all_ metricsets are commented out
and the System module is enabled, {beatname_uc} uses the default metricsets.

Note that certain metricsets may access `/proc` to gather process information,
and the resulting `ptrace_may_access()` call by the kernel to check for
permissions can be blocked by
https://gitlab.com/apparmor/apparmor/wikis/TechnicalDoc_Proc_and_ptrace[AppArmor
and other LSM software], even though the System module doesn't use `ptrace`
directly.

## Compatibility

The System metricsets collect different kinds of metric data, which may require dedicated permissions
to be fetched and which may vary across operating systems.

## Metrics

### Core

The System `core` metricset provides usage statistics for each CPU core.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.core.id | CPU Core number. | long |
| system.core.idle.pct | The percentage of CPU time spent idle. | scaled_float |
| system.core.idle.ticks | The amount of CPU time spent idle. | long |
| system.core.iowait.pct | The percentage of CPU time spent in wait (on disk). | scaled_float |
| system.core.iowait.ticks | The amount of CPU time spent in wait (on disk). | long |
| system.core.irq.pct | The percentage of CPU time spent servicing and handling hardware interrupts. | scaled_float |
| system.core.irq.ticks | The amount of CPU time spent servicing and handling hardware interrupts. | long |
| system.core.nice.pct | The percentage of CPU time spent on low-priority processes. | scaled_float |
| system.core.nice.ticks | The amount of CPU time spent on low-priority processes. | long |
| system.core.softirq.pct | The percentage of CPU time spent servicing and handling software interrupts. | scaled_float |
| system.core.softirq.ticks | The amount of CPU time spent servicing and handling software interrupts. | long |
| system.core.steal.pct | The percentage of CPU time spent in involuntary wait by the virtual CPU while the hypervisor was servicing another processor. Available only on Unix. | scaled_float |
| system.core.steal.ticks | The amount of CPU time spent in involuntary wait by the virtual CPU while the hypervisor was servicing another processor. Available only on Unix. | long |
| system.core.system.pct | The percentage of CPU time spent in kernel space. | scaled_float |
| system.core.system.ticks | The amount of CPU time spent in kernel space. | long |
| system.core.user.pct | The percentage of CPU time spent in user space. | scaled_float |
| system.core.user.ticks | The amount of CPU time spent in user space. | long |



### CPU

The System `cpu` metricset provides CPU statistics.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.cpu.cores | The number of CPU cores present on the host. The non-normalized percentages will have a maximum value of `100% * cores`. The normalized percentages already take this value into account and have a maximum value of 100%. | long |
| system.cpu.idle.norm.pct | The percentage of CPU time spent idle. | scaled_float |
| system.cpu.idle.pct | The percentage of CPU time spent idle. | scaled_float |
| system.cpu.idle.ticks | The amount of CPU time spent idle. | long |
| system.cpu.iowait.norm.pct | The percentage of CPU time spent in wait (on disk). | scaled_float |
| system.cpu.iowait.pct | The percentage of CPU time spent in wait (on disk). | scaled_float |
| system.cpu.iowait.ticks | The amount of CPU time spent in wait (on disk). | long |
| system.cpu.irq.norm.pct | The percentage of CPU time spent servicing and handling hardware interrupts. | scaled_float |
| system.cpu.irq.pct | The percentage of CPU time spent servicing and handling hardware interrupts. | scaled_float |
| system.cpu.irq.ticks | The amount of CPU time spent servicing and handling hardware interrupts. | long |
| system.cpu.nice.norm.pct | The percentage of CPU time spent on low-priority processes. | scaled_float |
| system.cpu.nice.pct | The percentage of CPU time spent on low-priority processes. | scaled_float |
| system.cpu.nice.ticks | The amount of CPU time spent on low-priority processes. | long |
| system.cpu.softirq.norm.pct | The percentage of CPU time spent servicing and handling software interrupts. | scaled_float |
| system.cpu.softirq.pct | The percentage of CPU time spent servicing and handling software interrupts. | scaled_float |
| system.cpu.softirq.ticks | The amount of CPU time spent servicing and handling software interrupts. | long |
| system.cpu.steal.norm.pct | The percentage of CPU time spent in involuntary wait by the virtual CPU while the hypervisor was servicing another processor. Available only on Unix. | scaled_float |
| system.cpu.steal.pct | The percentage of CPU time spent in involuntary wait by the virtual CPU while the hypervisor was servicing another processor. Available only on Unix. | scaled_float |
| system.cpu.steal.ticks | The amount of CPU time spent in involuntary wait by the virtual CPU while the hypervisor was servicing another processor. Available only on Unix. | long |
| system.cpu.system.norm.pct | The percentage of CPU time spent in kernel space. | scaled_float |
| system.cpu.system.pct | The percentage of CPU time spent in kernel space. | scaled_float |
| system.cpu.system.ticks | The amount of CPU time spent in kernel space. | long |
| system.cpu.total.norm.pct | The percentage of CPU time in states other than Idle and IOWait, normalised by the number of cores. | scaled_float |
| system.cpu.total.pct | The percentage of CPU time spent in states other than Idle and IOWait. | scaled_float |
| system.cpu.user.norm.pct | The percentage of CPU time spent in user space. | scaled_float |
| system.cpu.user.pct | The percentage of CPU time spent in user space. On multi-core systems, you can have percentages that are greater than 100%. For example, if 3 cores are at 60% use, then the `system.cpu.user.pct` will be 180%. | scaled_float |
| system.cpu.user.ticks | The amount of CPU time spent in user space. | long |


### Diskio

The System `diskio` metricset provides disk IO metrics collected from the
operating system. One event is created for each disk mounted on the system.

This metricset is available on:

- Linux
- macOS (requires 10.10+)
- Windows
- FreeBSD (amd64)

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.diskio.io.time | The total number of of milliseconds spent doing I/Os. | long |
| system.diskio.iostat.await | The average time spent for requests issued to the device to be served. | float |
| system.diskio.iostat.busy | Percentage of CPU time during which I/O requests were issued to the device (bandwidth utilization for the device). Device saturation occurs when this value is close to 100%. | float |
| system.diskio.iostat.queue.avg_size | The average queue length of the requests that were issued to the device. | float |
| system.diskio.iostat.read.await | The average time spent for read requests issued to the device to be served. | float |
| system.diskio.iostat.read.per_sec.bytes | The number of Bytes read from the device per second. | float |
| system.diskio.iostat.read.request.merges_per_sec | The number of read requests merged per second that were queued to the device. | float |
| system.diskio.iostat.read.request.per_sec | The number of read requests that were issued to the device per second | float |
| system.diskio.iostat.request.avg_size | The average size (in bytes) of the requests that were issued to the device. | float |
| system.diskio.iostat.service_time | The average service time (in milliseconds) for I/O requests that were issued to the device. | float |
| system.diskio.iostat.write.await | The average time spent for write requests issued to the device to be served. | float |
| system.diskio.iostat.write.per_sec.bytes | The number of Bytes write from the device per second. | float |
| system.diskio.iostat.write.request.merges_per_sec | The number of write requests merged per second that were queued to the device. | float |
| system.diskio.iostat.write.request.per_sec | The number of write requests that were issued to the device per second | float |
| system.diskio.name | The disk name. | keyword |
| system.diskio.read.bytes | The total number of bytes read successfully. On Linux this is the number of sectors read multiplied by an assumed sector size of 512. | long |
| system.diskio.read.count | The total number of reads completed successfully. | long |
| system.diskio.read.time | The total number of milliseconds spent by all reads. | long |
| system.diskio.serial_number | The disk's serial number. This may not be provided by all operating systems. | keyword |
| system.diskio.write.bytes | The total number of bytes written successfully. On Linux this is the number of sectors written multiplied by an assumed sector size of 512. | long |
| system.diskio.write.count | The total number of writes completed successfully. | long |
| system.diskio.write.time | The total number of milliseconds spent by all writes. | long |


### Entropy

This is the entropy metricset of the module system. 
It collects the amount of available entropy in bits. On kernel versions greater than 2.6, 
entropy will be out of a total pool size of 4096.

This Metricset is available on:

- linux

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.entropy.available_bits | The available bits of entropy | long |
| system.entropy.pct | The percentage of available entropy, relative to the pool size of 4096 | scaled_float |


### Filesystem

The System `filesystem` metricset provides file system statistics. For each file
system, one document is provided.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.filesystem.available | The disk space available to an unprivileged user in bytes. | long |
| system.filesystem.device_name | The disk name. For example: `/dev/disk1` | keyword |
| system.filesystem.files | The total number of file nodes in the file system. | long |
| system.filesystem.free | The disk space available in bytes. | long |
| system.filesystem.free_files | The number of free file nodes in the file system. | long |
| system.filesystem.mount_point | The mounting point. For example: `/` | keyword |
| system.filesystem.total | The total disk space in bytes. | long |
| system.filesystem.type | The disk type. For example: `ext4` | keyword |
| system.filesystem.used.bytes | The used disk space in bytes. | long |
| system.filesystem.used.pct | The percentage of used disk space. | scaled_float |


### Fsstat

The System `fsstat` metricset provides overall file system statistics.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.fsstat.count | Number of file systems found. | long |
| system.fsstat.total_files | Total number of files. | long |
| system.fsstat.total_size.free | Total free space. | long |
| system.fsstat.total_size.total | Total space (used plus free). | long |
| system.fsstat.total_size.used | Total used space. | long |


### Load

The System `load` metricset provides load statistics.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.load.1 | Load average for the last minute. | scaled_float |
| system.load.15 | Load average for the last 15 minutes. | scaled_float |
| system.load.5 | Load average for the last 5 minutes. | scaled_float |
| system.load.cores | The number of CPU cores present on the host. | long |
| system.load.norm.1 | Load for the last minute divided by the number of cores. | scaled_float |
| system.load.norm.15 | Load for the last 15 minutes divided by the number of cores. | scaled_float |
| system.load.norm.5 | Load for the last 5 minutes divided by the number of cores. | scaled_float |


### Memory

The System `memory` metricset provides memory statistics.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- OpenBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.memory.actual.free | Actual free memory in bytes. It is calculated based on the OS. On Linux this value will be MemAvailable from /proc/meminfo,  or calculated from free memory plus caches and buffers if /proc/meminfo is not available. On OSX it is a sum of free memory and the inactive memory. On Windows, it is equal to `system.memory.free`. | long |
| system.memory.actual.used.bytes | Actual used memory in bytes. It represents the difference between the total and the available memory. The available memory depends on the OS. For more details, please check `system.actual.free`. | long |
| system.memory.actual.used.pct | The percentage of actual used memory. | scaled_float |
| system.memory.free | The total amount of free memory in bytes. This value does not include memory consumed by system caches and buffers (see system.memory.actual.free). | long |
| system.memory.hugepages.default_size | Default size for huge pages. | long |
| system.memory.hugepages.free | Number of available huge pages in the pool. | long |
| system.memory.hugepages.reserved | Number of reserved but not allocated huge pages in the pool. | long |
| system.memory.hugepages.surplus | Number of overcommited huge pages. | long |
| system.memory.hugepages.swap.out.fallback | Count of huge pages that must be split before swapout | long |
| system.memory.hugepages.swap.out.pages | pages swapped out | long |
| system.memory.hugepages.total | Number of huge pages in the pool. | long |
| system.memory.hugepages.used.bytes | Memory used in allocated huge pages. | long |
| system.memory.hugepages.used.pct | Percentage of huge pages used. | long |
| system.memory.page_stats.direct_efficiency.pct | direct reclaim efficiency percentage. A lower percentage indicates the system is struggling to reclaim memory. | scaled_float |
| system.memory.page_stats.kswapd_efficiency.pct | kswapd reclaim efficiency percentage. A lower percentage indicates the system is struggling to reclaim memory. | scaled_float |
| system.memory.page_stats.pgfree.pages | pages freed by the system | long |
| system.memory.page_stats.pgscan_direct.pages | pages scanned directly | long |
| system.memory.page_stats.pgscan_kswapd.pages | pages scanned by kswapd | long |
| system.memory.page_stats.pgsteal_direct.pages | number of pages reclaimed directly | long |
| system.memory.page_stats.pgsteal_kswapd.pages | number of pages reclaimed by kswapd | long |
| system.memory.swap.free | Available swap memory. | long |
| system.memory.swap.in.pages | count of pages swapped in | long |
| system.memory.swap.out.pages | count of pages swapped out | long |
| system.memory.swap.readahead.cached | swap readahead cache hits | long |
| system.memory.swap.readahead.pages | swap readahead pages | long |
| system.memory.swap.total | Total swap memory. | long |
| system.memory.swap.used.bytes | Used swap memory. | long |
| system.memory.swap.used.pct | The percentage of used swap memory. | scaled_float |
| system.memory.total | Total memory. | long |
| system.memory.used.bytes | Used memory. | long |
| system.memory.used.pct | The percentage of used memory. | scaled_float |


### Network

The System `network` metricset provides network IO metrics collected from the
operating system. One event is created for each network interface.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.network.in.bytes | The number of bytes received. | long |
| system.network.in.dropped | The number of incoming packets that were dropped. | long |
| system.network.in.errors | The number of errors while receiving. | long |
| system.network.in.packets | The number or packets received. | long |
| system.network.name | The network interface name. | keyword |
| system.network.out.bytes | The number of bytes sent. | long |
| system.network.out.dropped | The number of outgoing packets that were dropped. This value is always 0 on Darwin and BSD because it is not reported by the operating system. | long |
| system.network.out.errors | The number of errors while sending. | long |
| system.network.out.packets | The number of packets sent. | long |


### Network_summary

The System `network_summary` metricset provides network IO metrics collected from the
operating system. These events are global and sorted by protocol.

This metricset is available on:

- Linux

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.network_summary.icmp.* | ICMP counters | object |
| system.network_summary.ip.* | IP counters | object |
| system.network_summary.tcp.* | TCP counters | object |
| system.network_summary.udp.* | UDP counters | object |
| system.network_summary.udp_lite.* | UDP Lite counters | object |


### Process

The System `process` metricset provides process statistics. One document is
provided for each process.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| process.name | Process name. Sometimes called program name or similar. | keyword |
| process.pgid | Identifier of the group of processes the process belongs to. | long |
| process.pid | Process id. | long |
| process.ppid | Parent process' pid. | long |
| process.working_directory | The working directory of the process. | keyword |
| system.process.cgroup.blkio.id | ID of the cgroup. | keyword |
| system.process.cgroup.blkio.path | Path to the cgroup relative to the cgroup subsystems mountpoint. | keyword |
| system.process.cgroup.blkio.total.bytes | Total number of bytes transferred to and from all block devices by processes in the cgroup. | long |
| system.process.cgroup.blkio.total.ios | Total number of I/O operations performed on all devices by processes in the cgroup as seen by the throttling policy. | long |
| system.process.cgroup.cpu.cfs.period.us | Period of time in microseconds for how regularly a cgroup's access to CPU resources should be reallocated. | long |
| system.process.cgroup.cpu.cfs.quota.us | Total amount of time in microseconds for which all tasks in a cgroup can run during one period (as defined by cfs.period.us). | long |
| system.process.cgroup.cpu.cfs.shares | An integer value that specifies a relative share of CPU time available to the tasks in a cgroup. The value specified in the cpu.shares file must be 2 or higher. | long |
| system.process.cgroup.cpu.id | ID of the cgroup. | keyword |
| system.process.cgroup.cpu.path | Path to the cgroup relative to the cgroup subsystem's mountpoint. | keyword |
| system.process.cgroup.cpu.rt.period.us | Period of time in microseconds for how regularly a cgroup's access to CPU resources is reallocated. | long |
| system.process.cgroup.cpu.rt.runtime.us | Period of time in microseconds for the longest continuous period in which the tasks in a cgroup have access to CPU resources. | long |
| system.process.cgroup.cpu.stats.periods | Number of period intervals (as specified in cpu.cfs.period.us) that have elapsed. | long |
| system.process.cgroup.cpu.stats.throttled.ns | The total time duration (in nanoseconds) for which tasks in a cgroup have been throttled. | long |
| system.process.cgroup.cpu.stats.throttled.periods | Number of times tasks in a cgroup have been throttled (that is, not allowed to run because they have exhausted all of the available time as specified by their quota). | long |
| system.process.cgroup.cpuacct.id | ID of the cgroup. | keyword |
| system.process.cgroup.cpuacct.path | Path to the cgroup relative to the cgroup subsystem's mountpoint. | keyword |
| system.process.cgroup.cpuacct.percpu | CPU time (in nanoseconds) consumed on each CPU by all tasks in this cgroup. | object |
| system.process.cgroup.cpuacct.stats.system.ns | CPU time consumed by tasks in user (kernel) mode. | long |
| system.process.cgroup.cpuacct.stats.user.ns | CPU time consumed by tasks in user mode. | long |
| system.process.cgroup.cpuacct.total.ns | Total CPU time in nanoseconds consumed by all tasks in the cgroup. | long |
| system.process.cgroup.id | The ID common to all cgroups associated with this task. If there isn't a common ID used by all cgroups this field will be absent. | keyword |
| system.process.cgroup.memory.id | ID of the cgroup. | keyword |
| system.process.cgroup.memory.kmem.failures | The number of times that the memory limit (kmem.limit.bytes) was reached. | long |
| system.process.cgroup.memory.kmem.limit.bytes | The maximum amount of kernel memory that tasks in the cgroup are allowed to use. | long |
| system.process.cgroup.memory.kmem.usage.bytes | Total kernel memory usage by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.kmem.usage.max.bytes | The maximum kernel memory used by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.kmem_tcp.failures | The number of times that the memory limit (kmem_tcp.limit.bytes) was reached. | long |
| system.process.cgroup.memory.kmem_tcp.limit.bytes | The maximum amount of memory for TCP buffers that tasks in the cgroup are allowed to use. | long |
| system.process.cgroup.memory.kmem_tcp.usage.bytes | Total memory usage for TCP buffers in bytes. | long |
| system.process.cgroup.memory.kmem_tcp.usage.max.bytes | The maximum memory used for TCP buffers by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.mem.failures | The number of times that the memory limit (mem.limit.bytes) was reached. | long |
| system.process.cgroup.memory.mem.limit.bytes | The maximum amount of user memory in bytes (including file cache) that tasks in the cgroup are allowed to use. | long |
| system.process.cgroup.memory.mem.usage.bytes | Total memory usage by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.mem.usage.max.bytes | The maximum memory used by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.memsw.failures | The number of times that the memory plus swap space limit (memsw.limit.bytes) was reached. | long |
| system.process.cgroup.memory.memsw.limit.bytes | The maximum amount for the sum of memory and swap usage that tasks in the cgroup are allowed to use. | long |
| system.process.cgroup.memory.memsw.usage.bytes | The sum of current memory usage plus swap space used by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.memsw.usage.max.bytes | The maximum amount of memory and swap space used by processes in the cgroup (in bytes). | long |
| system.process.cgroup.memory.path | Path to the cgroup relative to the cgroup subsystem's mountpoint. | keyword |
| system.process.cgroup.memory.stats.active_anon.bytes | Anonymous and swap cache on active least-recently-used (LRU) list, including tmpfs (shmem), in bytes. | long |
| system.process.cgroup.memory.stats.active_file.bytes | File-backed memory on active LRU list, in bytes. | long |
| system.process.cgroup.memory.stats.cache.bytes | Page cache, including tmpfs (shmem), in bytes. | long |
| system.process.cgroup.memory.stats.hierarchical_memory_limit.bytes | Memory limit for the hierarchy that contains the memory cgroup, in bytes. | long |
| system.process.cgroup.memory.stats.hierarchical_memsw_limit.bytes | Memory plus swap limit for the hierarchy that contains the memory cgroup, in bytes. | long |
| system.process.cgroup.memory.stats.inactive_anon.bytes | Anonymous and swap cache on inactive LRU list, including tmpfs (shmem), in bytes | long |
| system.process.cgroup.memory.stats.inactive_file.bytes | File-backed memory on inactive LRU list, in bytes. | long |
| system.process.cgroup.memory.stats.major_page_faults | Number of times that a process in the cgroup triggered a major fault. "Major" faults happen when the kernel actually has to read the data from disk. | long |
| system.process.cgroup.memory.stats.mapped_file.bytes | Size of memory-mapped mapped files, including tmpfs (shmem), in bytes. | long |
| system.process.cgroup.memory.stats.page_faults | Number of times that a process in the cgroup triggered a page fault. | long |
| system.process.cgroup.memory.stats.pages_in | Number of pages paged into memory. This is a counter. | long |
| system.process.cgroup.memory.stats.pages_out | Number of pages paged out of memory. This is a counter. | long |
| system.process.cgroup.memory.stats.rss.bytes | Anonymous and swap cache (includes transparent hugepages), not including tmpfs (shmem), in bytes. | long |
| system.process.cgroup.memory.stats.rss_huge.bytes | Number of bytes of anonymous transparent hugepages. | long |
| system.process.cgroup.memory.stats.swap.bytes | Swap usage, in bytes. | long |
| system.process.cgroup.memory.stats.unevictable.bytes | Memory that cannot be reclaimed, in bytes. | long |
| system.process.cgroup.path | The path to the cgroup relative to the cgroup subsystem's mountpoint. If there isn't a common path used by all cgroups this field will be absent. | keyword |
| system.process.cmdline | The full command-line used to start the process, including the arguments separated by space. | keyword |
| system.process.cpu.start_time | The time when the process was started. | date |
| system.process.cpu.system.ticks | The amount of CPU time the process spent in kernel space. | long |
| system.process.cpu.total.norm.pct | The percentage of CPU time spent by the process since the last event. This value is normalized by the number of CPU cores and it ranges from 0 to 100%. | scaled_float |
| system.process.cpu.total.pct | The percentage of CPU time spent by the process since the last update. Its value is similar to the %CPU value of the process displayed by the top command on Unix systems. | scaled_float |
| system.process.cpu.total.ticks | The total CPU time spent by the process. | long |
| system.process.cpu.total.value | The value of CPU usage since starting the process. | long |
| system.process.cpu.user.ticks | The amount of CPU time the process spent in user space. | long |
| system.process.env | The environment variables used to start the process. The data is available on FreeBSD, Linux, and OS X. | object |
| system.process.fd.limit.hard | The hard limit on the number of file descriptors opened by the process. The hard limit can only be raised by root. | long |
| system.process.fd.limit.soft | The soft limit on the number of file descriptors opened by the process. The soft limit can be changed by the process at any time. | long |
| system.process.fd.open | The number of file descriptors open by the process. | long |
| system.process.memory.rss.bytes | The Resident Set Size. The amount of memory the process occupied in main memory (RAM). On Windows this represents the current working set size, in bytes. | long |
| system.process.memory.rss.pct | The percentage of memory the process occupied in main memory (RAM). | scaled_float |
| system.process.memory.share | The shared memory the process uses. | long |
| system.process.memory.size | The total virtual memory the process has. On Windows this represents the Commit Charge (the total amount of memory that the memory manager has committed for a running process) value in bytes for this process. | long |
| system.process.state | The process state. For example: "running". | keyword |
| user.name | Short name or login of the user. | keyword |


### Process_summary

The `process_summary` metricset collects high level statistics about the running
processes.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.process.summary.dead | Number of dead processes on this host. It's very unlikely that it will appear but in some special situations it may happen. | long |
| system.process.summary.idle | Number of idle processes on this host. | long |
| system.process.summary.running | Number of running processes on this host. | long |
| system.process.summary.sleeping | Number of sleeping processes on this host. | long |
| system.process.summary.stopped | Number of stopped processes on this host. | long |
| system.process.summary.total | Total number of processes on this host. | long |
| system.process.summary.unknown | Number of processes for which the state couldn't be retrieved or is unknown. | long |
| system.process.summary.zombie | Number of zombie processes on this host. | long |


### raid

This is the raid metricset of the module system. It collects stats about the raid.

This metricset is available on:

- Linux

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.raid.blocks.synced | Number of blocks on the device that are in sync, in 1024-byte blocks. | long |
| system.raid.blocks.total | Number of blocks the device holds, in 1024-byte blocks. | long |
| system.raid.disks.active | Number of active disks. | long |
| system.raid.disks.failed | Number of failed disks. | long |
| system.raid.disks.spare | Number of spared disks. | long |
| system.raid.disks.states.* | map of raw disk states | object |
| system.raid.disks.total | Total number of disks the device consists of. | long |
| system.raid.level | The raid level of the device | keyword |
| system.raid.name | Name of the device. | keyword |
| system.raid.status | activity-state of the device. | keyword |
| system.raid.sync_action | Current sync action, if the RAID array is redundant | keyword |


### Service

The `service` metricset reports on the status of systemd services.

This metricset is available on:

- Linux

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.service.exec_code | The SIGCHLD code from the service's main process | keyword |
| system.service.load_state | The load state of the service | keyword |
| system.service.name | The name of the service | keyword |
| system.service.resources.cpu.usage.ns | CPU usage in nanoseconds | long |
| system.service.resources.memory.usage.bytes | memory usage in bytes | long |
| system.service.resources.network.in.bytes | bytes in | long |
| system.service.resources.network.in.packets | packets in | long |
| system.service.resources.network.out.bytes | bytes out | long |
| system.service.resources.network.out.packets | packets out | long |
| system.service.resources.tasks.count | number of tasks associated with the service | long |
| system.service.state | The activity state of the service | keyword |
| system.service.state_since | The timestamp of the last state change. If the service is active and running, this is its uptime. | date |
| system.service.sub_state | The sub-state of the service | keyword |


### Socket

This metricset is available on Linux only and requires kernel 2.6.14 or newer.

The system `socket` metricset reports an event for each new TCP socket that it
sees. It does this by polling the kernel periodically to get a dump of all
sockets. You set the polling interval by configuring the `period` option.
Specifying a short polling interval with this metricset is important to avoid
missing short-lived connections.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| network.direction | Direction of the network traffic. Recommended values are:   * inbound   * outbound   * internal   * external   * unknown  When mapping events from a host-based monitoring context, populate this field from the host's point of view. When mapping events from a network or perimeter-based monitoring context, populate this field from the point of view of your network perimeter. | keyword |
| network.type | In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc The field value must be normalized to lowercase for querying. See the documentation section "Implementing ECS". | keyword |
| process.executable | Absolute path to the process executable. | keyword |
| process.name | Process name. Sometimes called program name or similar. | keyword |
| process.pid | Process id. | long |
| system.socket.local.ip | Local IP address. This can be an IPv4 or IPv6 address. | ip |
| system.socket.local.port | Local port. | long |
| system.socket.process.cmdline | Full command line | keyword |
| system.socket.remote.etld_plus_one | The effective top-level domain (eTLD) of the remote host plus one more label. For example, the eTLD+1 for "foo.bar.golang.org." is "golang.org.". The data for determining the eTLD comes from an embedded copy of the data from http://publicsuffix.org. | keyword |
| system.socket.remote.host | PTR record associated with the remote IP. It is obtained via reverse IP lookup. | keyword |
| system.socket.remote.host_error | Error describing the cause of the reverse lookup failure. | keyword |
| system.socket.remote.ip | Remote IP address. This can be an IPv4 or IPv6 address. | ip |
| system.socket.remote.port | Remote port. | long |
| user.full_name | User's full name, if available. | keyword |
| user.id | Unique identifier of the user. | keyword |


### Socket_summary

The System `socket_summary` metricset provides the summary of open network
sockets in the host system.

It collects a summary of metrics with the count of existing TCP and UDP
connections and the count of listening ports.

This metricset is available on:

- FreeBSD
- Linux
- macOS
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.socket.summary.all.count | All open connections | integer |
| system.socket.summary.all.listening | All listening ports | integer |
| system.socket.summary.tcp.all.close_wait | Number of TCP connections in _close_wait_ state | integer |
| system.socket.summary.tcp.all.closing | Number of TCP connections in _closing_ state | integer |
| system.socket.summary.tcp.all.count | All open TCP connections | integer |
| system.socket.summary.tcp.all.established | Number of established TCP connections | integer |
| system.socket.summary.tcp.all.fin_wait1 | Number of TCP connections in _fin_wait1_ state | integer |
| system.socket.summary.tcp.all.fin_wait2 | Number of TCP connections in _fin_wait2_ state | integer |
| system.socket.summary.tcp.all.last_ack | Number of TCP connections in _last_ack_ state | integer |
| system.socket.summary.tcp.all.listening | All TCP listening ports | integer |
| system.socket.summary.tcp.all.orphan | A count of all orphaned tcp sockets. Only available on Linux. | integer |
| system.socket.summary.tcp.all.syn_recv | Number of TCP connections in _syn_recv_ state | integer |
| system.socket.summary.tcp.all.syn_sent | Number of TCP connections in _syn_sent_ state | integer |
| system.socket.summary.tcp.all.time_wait | Number of TCP connections in _time_wait_ state | integer |
| system.socket.summary.tcp.memory | Memory used by TCP sockets in bytes, based on number of allocated pages and system page size. Corresponds to limits set in /proc/sys/net/ipv4/tcp_mem. Only available on Linux. | integer |
| system.socket.summary.udp.all.count | All open UDP connections | integer |
| system.socket.summary.udp.memory | Memory used by UDP sockets in bytes, based on number of allocated pages and system page size. Corresponds to limits set in /proc/sys/net/ipv4/udp_mem. Only available on Linux. | integer |


### Uptime

The System `uptime` metricset provides the uptime of the host operating system.

This metricset is available on:

- Linux
- macOS
- OpenBSD
- FreeBSD
- Windows

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.uptime.duration.ms | The OS uptime in milliseconds. | long |


### Users

The system/users metricset reports logged in users and associated sessions via dbus and logind, which is a systemd component. By default, the metricset will look in `/var/run/dbus/` for a system socket, although a new path can be selected with `DBUS_SYSTEM_BUS_ADDRESS`.

This metricset is available on:

- Linux

**Exported fields**

| Field | Description | Type |
|---|---|---|
| system.users.id | The ID of the session | keyword |
| system.users.leader | The root PID of the session | long |
| system.users.path | The DBus object path of the session | keyword |
| system.users.remote | A bool indicating a remote session | boolean |
| system.users.remote_host | A remote host address for the session | keyword |
| system.users.scope | The associated systemd scope | keyword |
| system.users.seat | An associated logind seat | keyword |
| system.users.service | A session associated with the service | keyword |
| system.users.state | The current state of the session | keyword |
| system.users.type | The type of the user session | keyword |
