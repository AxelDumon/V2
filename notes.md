# Docker

### Mettre en place des conteneurs

```
docker run --name <nom> --net host mongo mongod --replSet <nom_set> --port <port>

# ex: docker run --name mongo1 --net host mongo mongod --replSet mon-rs --port 30001
```


- l’option --net host indique que les ports réseau des conteneurs sont publiés sur la machine-hôte de Docker;

- l’option replSet indique que les serveurs mongod sont prêts à participer à un replica set nommé \<nom_set>

- l’option --port indique le port sur lequel le serveur mongod est à l’écoute; comme ce port est publié sur la machine hôte, en combinant l’IP de cette dernière et le port, on peut s’adresser à l’un des trois serveurs.


---

# Mongo

### Se connercter à une machine via un port

```
mongo --host <ip> --port <port>

# ex: mongo --host 192.168.99.100 --port 30001
```
--- 
### Initialiser un replica set et lui ajouter des noeuds

```
rs.initiate()
```

```
rs.add("<ip>:<port>")

# ex: rs.add("192.168.99.100:30001")
```
---
### Avoir des infos sur le replica set

Tout savoir:
```
rs.status()
```

Savoir quel noeud a été élu maitre:
```
db.isMaster()
```
---
### Imports

```
mongoimport -d <db_name> -c <collection_name> --file <name.json> --jsonArray --host <hostIP> --port <xxx>
```
---

#### Utiliser une base

```
use <db_name>
```

# Podman

### Run une image

"podman run" permet simplement de lancer une commande de base

```
podman run -it <image>

# ex: podman run -it docker.io/library/busybox

# ex: podman run --detach --name todoDB -p <HOST_PORT(3000)>:27017 docker.io/mongodb/mongodb-community-server:latest

# ex: podman

 run --detach --name todoDB -p <HOST_PORT(3000)>:27017 -v /path/to/host/data:/data/db docker.io/mongodb/mongodb-community-server:latest

```

- -i, --interactive                              Keep STDIN open even if not attached

- --ip string                                Specify a static IPv4 address for the container

- -l, --label stringArray                        Set metadata on container

- --mount stringArray                        Attach a filesystem mount to the container

- --name string                              Assign a name to the container

- --network stringArray                      Connect a container to a network

- -t, --tty                                      Allocate a pseudo-TTY for container

---

### Obtenir une image

```
podman pull <image>

# ex: podman pull docker.io/mongodb/mongodb-community-server:latest
```

---

### Lister les images locales

```
podman images
```

