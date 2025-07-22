# Helper Scripts 

## contextual_flyout_setup.sh

This script helps user loads some Vulnerabilities, Misconfigurations, as well as Alerts associated with those Vulnerabilities and Misconfigurations. This is all done by loading the **es_archiver** file. The script will also update the timestamp field so it matches the current timestamp to make sure everything is within the retention period. This is done by doing an API request to the **_update_by_query** endpoint on **es** to update the timestamp

To run this script, dev can just navigate to `kibana/x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/helper_scripts/contextual_flyout_setup.sh` and then run:

```bash
bash contextual_flyout_setup.sh
```
