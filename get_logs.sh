#!bin/bash
# filepath: /home/axeldumon/Code/V2/get_logs.sh


podman logs machine1 > ./logs/machine1.log
podman logs machine2 > ./logs/machine2.log
podman logs machine3 > ./logs/machine3.log
