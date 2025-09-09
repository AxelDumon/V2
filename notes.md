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

## ROOTLESS

/etc/subuid and /etc/subgid configuration

```
<USERNAME>:<UID>:<RANGE>

#ex: 
cat /etc/subuid
johndoe:100000:65536
test:165536:65536
```

"usermod" peut être utiliser pour modifier ces fichiers

```
#ex: usermod --add-subuids 100000-165535 --add-subgids 100000-165535 johndoe
```

!! Cependant il faut avoir éteint tout les conteneurs de l'utilisateur qu'on veut modifier ce qui peut être fait automatiquement avec : "podman system migrate" en tant que l'utilisateur voulu !!

### Liste des choses non faisable en rootless

https://github.com/containers/podman/blob/main/rootless.md

### Activer les pings

si requis : il faut verifier que l'UID du user est dans "/proc/sys/net/ipv4/ping_group_range"

### Info

https://github.com/containers/podman/blob/main/README.md#commands

###### Comparatifs commandes podman & docker :

https://github.com/containers/podman/blob/main/transfer.md

le travail pour pouvoir utiliser Podman en rootless est majoritairement fait par l'administrateur de la machine qui doit faire le setup sur la machine et la configuration de l'utilisateur dans les fichiers cité plus haut. Ensuite c'est bon, l'utilisateur peut utiliser les commandes comme bon lui semble.

A NOTER

The Podman configuration files for root reside in /usr/share/containers with overrides in /etc/containers. In the rootless environment they reside in ${XDG_CONFIG_HOME}/containers and are owned by each individual user.

Note: in environments without XDG environment variables, Podman internally sets the following defaults:
```
    $XDG_CONFIG_HOME = $HOME/.config
    $XDG_DATA_HOME = $HOME/.local/share
    $XDG_RUNTIME_DIR =
        /run/user/$UID on systemd environments
        $TMPDIR/podman-run-$UID otherwise
```
The three main configuration files are containers.conf, storage.conf and registries.conf. The user can modify these files as they wish.

##### containers.conf

Podman reads

    /usr/share/containers/containers.conf
    /etc/containers/containers.conf
    ${XDG_CONFIG_HOME}/containers/containers.conf

if they exist, in that order. Each file can override the previous for particular fields.

##### storage.conf

For storage.conf the order is

    /etc/containers/storage.conf
    ${XDG_CONFIG_HOME}/containers/storage.conf

In rootless Podman, certain fields in /etc/containers/storage.conf are ignored. These fields are:
```
graphroot=""
 container storage graph dir (default: "/var/lib/containers/storage")
 Default directory to store all writable content created by container storage programs.

runroot=""
 container storage run dir (default: "/run/containers/storage")
 Default directory to store all temporary writable content created by container storage programs.
```
In rootless Podman these fields default to
```
graphroot="\${XDG_DATA_HOME}/containers/storage"
runroot="${XDG_RUNTIME_DIR}/containers"
```
\$XDG_RUNTIME_DIR defaults on most systems to /run/user/$UID.

##### registries

Registry configuration is read in this order

```
    /etc/containers/registries.conf
    /etc/containers/registries.d/*
    ${XDG_CONFIG_HOME}/containers/registries.conf
```

The files in the home directory should be used to configure rootless Podman for personal needs. These files are not created by default. Users can copy the files from /usr/share/containers or /etc/containers and modify them.

##### Authorization files

The default authorization file used by the podman login and podman logout commands is ${XDG_RUNTIME_DIR}/containers/auth.json.

---

#### Using volumes

If your container runs with the root user, then root in the container is actually your user on the host. UID/GID 1 is the first UID/GID specified in your user's mapping in /etc/subuid and /etc/subgid, etc. If you mount a directory from the host into a container as a rootless user, and create a file in that directory as root in the container, you'll see it's actually owned by your user on the host.

--- 

### Run une image

"podman run" permet simplement de lancer une commande de base

```
podman run -it <image>

# ex: podman run -it docker.io/library/busybox

# ex: podman run --detach --name todoDB -p <HOST_PORT(3000)>:27017 docker.io/mongodb/mongodb-community-server:latest

# ex: podman

podman run --detach --name DB2 -p 3002:27017 -v /ho
me/axeldumon/Code/V2:/data/db docker.io/mongodb/mongodb-community-server:latest

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

### Lister les conteneurs en marche

```
podman ps
```

### Avoir des infos sur un conteneur

```
podman inspect <nom> | grep IPAddress\":
            "SecondaryIPAddresses": null,
            "IPAddress": "",
```

### voir les logs

```
podman logs <container_id>
```

### Regarder le pid d'un conteneur

```
podman top <container_id>
```

### Mettre en pause (checkpoint) un conteneur

à noter que ce n'est pas possible en rootless, si l'on veut le faire en root, il faut utiliser sudo.

```
sudo podman container checkpoint <container_id>
```

### Pour le remettre en route (restoring)

à noter que c'est que pour ceux en checkpoint

```
sudo podman container restore <container_id>
```

### Pour le stopper

```
podman stop <container_id>
```

### Supprimer

pour voir le statut d'un conteneur :
```
podman ps -a
``` 
et supprimer :
```
podman rm <container_id>
```

### SSH dedans

```
podman exec -ti <nom> /bin/bash
```