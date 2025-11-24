#!/bin/bash

tar -czf ExplorationToyProblem-Backend-master.tar.gz server
tar -czf ExplorationToyProblem-LocalFront-master.tar.gz public

mv ExplorationToyProblem-Backend-master.tar.gz /home/axel/Code/V2/ansible/roles/app/files
mv ExplorationToyProblem-LocalFront-master.tar.gz /home/axel/Code/V2/ansible/roles/app/files
