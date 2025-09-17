# Replace eth0 with your actual host interface!
HOST_IF="enp0s31f6"
BRIDGE_IF_1="podman1"
BRIDGE_IF_2="v2_default"

sudo iptables -F FORWARD

# Block container <-> container traffic
sudo iptables -I FORWARD -i $BRIDGE_IF_1 -o $BRIDGE_IF_1 -j DROP

# Allow host <-> containers
sudo iptables -I FORWARD -i $HOST_IF -o $BRIDGE_IF_1 -j ACCEPT
sudo iptables -I FORWARD -i $BRIDGE_IF_1 -o $HOST_IF -j ACCEPT

sudo iptables -I FORWARD -i $BRIDGE_IF_1 -o $BRIDGE_IF_1 -p icmp -j DROP
sudo iptables -P FORWARD DROP

echo "Only host-to-container communication allowed on $BRIDGE_IF_1."


# Block container <-> container traffic
sudo iptables -I FORWARD -i $BRIDGE_IF_2 -o $BRIDGE_IF_2 -j DROP

# Allow host <-> containers
sudo iptables -I FORWARD -i $HOST_IF -o $BRIDGE_IF_2 -j ACCEPT
sudo iptables -I FORWARD -i $BRIDGE_IF_2 -o $HOST_IF -j ACCEPT

sudo iptables -I FORWARD -i $BRIDGE_IF_2 -o $BRIDGE_IF_2 -p icmp -j DROP
sudo iptables -P FORWARD DROP

echo "Only host-to-container communication allowed on $BRIDGE_IF_2."