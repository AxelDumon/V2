Pour lancer l'application, il faut avoir Mongodb de lancé

```
sudo systemctl start mongod
```

Pour lancer le back il faut se positionner dans server/ et le lancer
```
cd server
npm start
```

Pour lancer le front il suffit d'être à la racine et de faire de même
```
npm start
```

podman run -it --detach --name test1 test:latest

podman build -t test -f Dockerfile



Désormais pour lancer les machines, il suffit de lancer 
```
./compose-restart.sh
```
cela va lancer chaque conteneurs, créer le replica-set, et bloquer le l'accès réseau de chaque machine sur le host pour empêcher les machines d'utiliser le réseau par défaut me permettant de garder l'affichage sur la machine host pour communiquer avec les autres conteneurs.
Cependant pour ce faire il faut être root, si l'on voulait le faire sans accès root il faudrait un conteneur pour l'affichage.