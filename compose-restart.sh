podman stop -t 2 machine3
podman stop -t 2 machine2
podman stop -t 2 machine1
podman-compose down -v
podman-compose up -d --build