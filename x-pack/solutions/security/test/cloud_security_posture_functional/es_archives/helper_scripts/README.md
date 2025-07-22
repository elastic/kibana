# Helper Scripts 

## contextual_flyout_setup.sh

This script helps user loads some Vulnerabilities, Misconfigurations as well as Alerts associated to those Vulnerabilities and Misconfigurations. This all is done by loading **es_archiver** file. The script will also updates the timestamp field so it matches the current timestamp to make sure everything is within the retention period, this is done by doing an API Call to **_update_by_query** endpoint on **es** to update the timestamp

To run this script, dev can just navigate to `kibana/x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/helper_scripts/contextual_flyout_setup.sh` and then run:

```bash
bash contextual_flyout_setup.sh
```
