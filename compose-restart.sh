podman stop -t 2 machine3 machine2 machine1
podman-compose down -v
podman-compose up -d --build